ALTER TYPE "app"."tipo_ordine" ADD VALUE IF NOT EXISTS 'licenza';--> statement-breakpoint
ALTER TYPE "app"."tipo_prezzo_riga" ADD VALUE IF NOT EXISTS 'licenza';--> statement-breakpoint
ALTER TYPE "app"."tipo_prodotto" ADD VALUE IF NOT EXISTS 'licenza';--> statement-breakpoint
CREATE TABLE "app"."avvisi_licenza" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"valida_fino" date NOT NULL,
	"giorni" integer NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."licenze" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"ordine_id" uuid NOT NULL,
	"pagato_il" date NOT NULL,
	"dal" date NOT NULL,
	"valida_fino" date NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "licenze_ordine_id_unique" UNIQUE("ordine_id")
);
--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD COLUMN "licenza_esente" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."avvisi_licenza" ADD CONSTRAINT "avvisi_licenza_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."licenze" ADD CONSTRAINT "licenze_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."licenze" ADD CONSTRAINT "licenze_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "app"."ordini"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avvisi_licenza_unico" ON "app"."avvisi_licenza" USING btree ("incaricato_id","valida_fino","giorni");--> statement-breakpoint
CREATE INDEX "licenze_incaricato" ON "app"."licenze" USING btree ("incaricato_id","pagato_il");--> statement-breakpoint
-- Garanzie della licenza annuale (decisione 31).
-- Periodi di licenza e avvisi: solo in aggiunta; un periodo finisce dopo che inizia.
ALTER TABLE "app"."licenze" ADD CONSTRAINT "licenze_date_valide" CHECK ("valida_fino" >= "dal");--> statement-breakpoint
CREATE TRIGGER "licenze_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."licenze" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE TRIGGER "avvisi_licenza_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."avvisi_licenza" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
-- Il rinnovo non dà punti, provvigioni né spedizione (il confronto è sul testo: il valore nuovo del tipo non si può usare
-- nella stessa transazione che lo aggiunge).
ALTER TABLE "app"."ordini" ADD CONSTRAINT "ordini_licenza_senza_punti"
  CHECK ("tipo"::text <> 'licenza' OR ("punti" = 0 AND "provvigione_acquisto" = 0 AND "spese_spedizione" = 0));--> statement-breakpoint
-- Esente: solo Giovanna Di Lillo (GL000001).
UPDATE "app"."incaricati" SET "licenza_esente" = true WHERE "codice" = 'GL000001';--> statement-breakpoint
-- Start kit già pagati: la licenza parte dal giorno del pagamento, per 12 mesi.
INSERT INTO "app"."licenze" ("incaricato_id", "ordine_id", "pagato_il", "dal", "valida_fino")
SELECT o."incaricato_id", o."id", (o."pagato_il" AT TIME ZONE 'Europe/Rome')::date, (o."pagato_il" AT TIME ZONE 'Europe/Rome')::date,
  ((o."pagato_il" AT TIME ZONE 'Europe/Rome')::date + interval '12 months')::date - 1
FROM "app"."ordini" o
WHERE o."tipo" = 'start_kit' AND o."pagato_il" IS NOT NULL AND o."stato" NOT IN ('annullato', 'reso');--> statement-breakpoint
-- Row Level Security anche sulle tabelle nuove (seconda barriera, come nelle migrazioni precedenti).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'app' LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA app FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM anon, authenticated';
  END IF;
END;
$$;
