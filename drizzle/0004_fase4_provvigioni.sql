CREATE TYPE "app"."tipo_quota_speciale" AS ENUM('master_president', 'quota_riservata');--> statement-breakpoint
CREATE TABLE "app"."leader_fondatori" (
	"incaricato_id" uuid PRIMARY KEY NOT NULL,
	"ingresso" date NOT NULL,
	"decade_dal" date,
	"creato_da" uuid,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."qualifiche_bloccate" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"percentuale" integer NOT NULL,
	"dal" date NOT NULL,
	"al" date,
	"motivo" text NOT NULL,
	"revocata_il" timestamp with time zone,
	"creato_da" uuid,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."quote_speciali" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"tipo" "app"."tipo_quota_speciale" NOT NULL,
	"percentuale" integer NOT NULL,
	"solo_se_attiva" boolean NOT NULL,
	"dal" date NOT NULL,
	"al" date,
	"creato_da" uuid,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD COLUMN "esclusa_pool" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD COLUMN "esclusa_bonus_auto" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."leader_fondatori" ADD CONSTRAINT "leader_fondatori_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."leader_fondatori" ADD CONSTRAINT "leader_fondatori_creato_da_utenti_id_fk" FOREIGN KEY ("creato_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."qualifiche_bloccate" ADD CONSTRAINT "qualifiche_bloccate_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."qualifiche_bloccate" ADD CONSTRAINT "qualifiche_bloccate_creato_da_utenti_id_fk" FOREIGN KEY ("creato_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."quote_speciali" ADD CONSTRAINT "quote_speciali_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."quote_speciali" ADD CONSTRAINT "quote_speciali_creato_da_utenti_id_fk" FOREIGN KEY ("creato_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qualifiche_bloccate_incaricato" ON "app"."qualifiche_bloccate" USING btree ("incaricato_id");--> statement-breakpoint
CREATE INDEX "quote_speciali_incaricato" ON "app"."quote_speciali" USING btree ("incaricato_id");--> statement-breakpoint
-- Controlli sui valori: percentuali tra 0 e 100% (le qualifiche bloccate al massimo 20%), date coerenti.
ALTER TABLE "app"."qualifiche_bloccate" ADD CONSTRAINT "qualifiche_bloccate_valori_validi"
  CHECK ("percentuale" > 0 AND "percentuale" <= 2000 AND ("al" IS NULL OR "al" >= "dal"));--> statement-breakpoint
ALTER TABLE "app"."quote_speciali" ADD CONSTRAINT "quote_speciali_valori_validi"
  CHECK ("percentuale" > 0 AND "percentuale" <= 10000 AND ("al" IS NULL OR "al" >= "dal"));--> statement-breakpoint
ALTER TABLE "app"."leader_fondatori" ADD CONSTRAINT "leader_fondatori_decadenza_valida"
  CHECK ("decade_dal" IS NULL OR ("decade_dal" > "ingresso" AND extract(day FROM "decade_dal") = 1));--> statement-breakpoint
-- Sponsor: si cambia solo con l'intervento tracciato della sede (che lo dichiara nella transazione)
-- e mai creando un ciclo nella genealogia.
CREATE FUNCTION "app"."proteggi_sponsor"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sponsor_id IS NOT DISTINCT FROM OLD.sponsor_id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND coalesce(current_setting('app.cambio_sponsor', true), '') <> 'tracciato' THEN
    RAISE EXCEPTION 'Lo sponsor si cambia solo dall''area sede, con il motivo registrato' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.sponsor_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE sopra AS (
      SELECT NEW.sponsor_id AS id
      UNION
      SELECT i.sponsor_id FROM "app"."incaricati" i JOIN sopra ON i.id = sopra.id WHERE i.sponsor_id IS NOT NULL
    )
    SELECT 1 FROM sopra WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Sponsor non valido: creerebbe un ciclo nella rete' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "sponsor_protetto" BEFORE INSERT OR UPDATE OF "sponsor_id" ON "app"."incaricati"
  FOR EACH ROW EXECUTE FUNCTION "app"."proteggi_sponsor"();--> statement-breakpoint
-- Seconda barriera: Row Level Security su tutte le tabelle, senza regole di accesso. Il server
-- dell'app (proprietario delle tabelle) continua a lavorare; chiunque arrivi da fuori, per esempio
-- con le chiavi pubbliche di Supabase, non vede e non scrive nulla.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'app' LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA app FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM anon, authenticated';
    EXECUTE 'REVOKE USAGE ON SCHEMA app FROM anon, authenticated';
  END IF;
END;
$$;--> statement-breakpoint
-- Le versioni dei parametri non si riscrivono: ogni modifica è una nuova versione (gli ordini e i calcoli le citano).
CREATE TRIGGER "parametri_versioni_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."parametri_versioni"
  FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
-- Piano Compensi rev. 6 (docs/piano-compensi.md, decisione 19), in vigore da oggi.
INSERT INTO "app"."parametri_versioni" ("valido_dal", "valori", "note")
VALUES ((now() AT TIME ZONE 'Europe/Rome')::date, '{"aliquotaIva":"2200","coefficientePunti":"8000","scontoIncaricata":"4000","scontoSuPrezzoIvato":true,"puntiStartKit":"3300","speseSpedizione":"690","provvigioneOnline":"5000","provvigioneKitSponsor":"5000","sogliaAttivita":"3300","tettoAcquistiQualifica":"25000","qualifiche":[{"nome":"New Star","soglia":"10000","percentuale":"400"},{"nome":"Partner","soglia":"60000","percentuale":"800"},{"nome":"Expert","soglia":"240000","percentuale":"1200"},{"nome":"Director","soglia":"600000","percentuale":"1600"},{"nome":"Leader","soglia":"1200000","percentuale":"2000"}],"sogliaLineaForte":"800000","titoli":[{"nome":"Leader in crescita","linee":1,"generazioni":["300"],"quotePool":0,"bonusAuto":"0"},{"nome":"Gold Leader","linee":2,"generazioni":["400"],"quotePool":1,"bonusAuto":"0"},{"nome":"Prestige Director","linee":3,"generazioni":["400","300"],"quotePool":2,"bonusAuto":"30000"},{"nome":"President","linee":4,"generazioni":["400","300","200"],"quotePool":3,"bonusAuto":"50000"},{"nome":"Diamond President","linee":5,"generazioni":["400","300","200","200","150"],"quotePool":5,"bonusAuto":"80000"}],"poolPercentuale":"300","fondatoriMassimo":10,"fondatoriMesiIngresso":12,"fondatoriDurataMesi":12,"fondatoriPercentualeBloccata":"1200","fondatoriBonus":"300","fondatoriRequisitoPunti":"100000","fondatoriRequisitoGiorni":90,"pagamentoMinimo":"5000","richiestaDalGiorno":3,"richiestaAlGiorno":6,"giornoPagamento":20,"ritenutaAliquota":"2300","ritenutaBase":"7800","inpsAliquota":"0","inpsQuotaAzienda":"0","inpsBaseImponibile":"0","inpsSogliaEsenzione":"0","limiteCompensiSuPunti":"7000","bloccateContanoComeLinee":false}'::jsonb, 'Piano Compensi rev. 6');--> statement-breakpoint
-- Listino (decisione 24).
UPDATE "app"."prodotti" SET "prezzo_listino" = 3390, "nome" = 'Shampoo Botox' WHERE "codice" = 'HB-SH';--> statement-breakpoint
UPDATE "app"."prodotti" SET "nome" = 'Maschera Botox' WHERE "codice" = 'HB-MA';--> statement-breakpoint
UPDATE "app"."prodotti" SET "nome" = 'Spray Botox 10in1' WHERE "codice" = 'HB-FS';--> statement-breakpoint
-- Giovanna Di Lillo (GL000001): bloccata al 20% senza scadenza, Master President 2% anche se inattiva,
-- esclusa da pool e bonus auto (sezione 6, decisione 20).
UPDATE "app"."incaricati" SET "esclusa_pool" = true, "esclusa_bonus_auto" = true WHERE "codice" = 'GL000001';--> statement-breakpoint
INSERT INTO "app"."qualifiche_bloccate" ("incaricato_id", "percentuale", "dal", "motivo")
SELECT "id", 2000, '2026-01-01', 'Fondatrice: bloccata al 20% senza scadenza (piano compensi, sezione 6)'
FROM "app"."incaricati" WHERE "codice" = 'GL000001';--> statement-breakpoint
INSERT INTO "app"."quote_speciali" ("incaricato_id", "tipo", "percentuale", "solo_se_attiva", "dal")
SELECT "id", 'master_president', 200, false, '2026-01-01'
FROM "app"."incaricati" WHERE "codice" = 'GL000001';--> statement-breakpoint
INSERT INTO "app"."registro_modifiche" ("azione", "entita", "entita_id", "dopo")
SELECT 'piano.figure_speciali', 'incaricato', "id"::text,
  '{"qualificaBloccata": 2000, "masterPresident": 200, "esclusaPool": true, "esclusaBonusAuto": true, "motivo": "Migrazione 0004, piano compensi rev. 6"}'::jsonb
FROM "app"."incaricati" WHERE "codice" = 'GL000001';
