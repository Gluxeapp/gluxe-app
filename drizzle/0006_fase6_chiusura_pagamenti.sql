CREATE TYPE "app"."regime_fiscale" AS ENUM('nessuna_piva', 'piva_ordinaria', 'piva_forfettaria');--> statement-breakpoint
CREATE TYPE "app"."stato_richiesta_pagamento" AS ENUM('richiesta', 'approvata', 'rifiutata', 'pagata');--> statement-breakpoint
CREATE TYPE "app"."tipo_documento" AS ENUM('ricevuta', 'fattura_ordinaria', 'fattura_forfettaria');--> statement-breakpoint
CREATE TYPE "app"."tipo_movimento" AS ENUM('voce', 'storno', 'richiesta', 'richiesta_rifiutata');--> statement-breakpoint
CREATE TABLE "app"."dati_azienda" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"ragione_sociale" text DEFAULT '' NOT NULL,
	"indirizzo" text DEFAULT '' NOT NULL,
	"cap" text DEFAULT '' NOT NULL,
	"citta" text DEFAULT '' NOT NULL,
	"provincia" text DEFAULT '' NOT NULL,
	"codice_fiscale" text DEFAULT '' NOT NULL,
	"partita_iva" text DEFAULT '' NOT NULL,
	"iban" text DEFAULT '' NOT NULL,
	"cuc" text DEFAULT '' NOT NULL,
	"autorizzazione_bollo" text DEFAULT '' NOT NULL,
	"modificato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."distinte_bonifici" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_pagamento" date NOT NULL,
	"id_messaggio" text NOT NULL,
	"numero_bonifici" integer NOT NULL,
	"totale" bigint NOT NULL,
	"xml" text NOT NULL,
	"creata_da" uuid,
	"creata_il" timestamp with time zone DEFAULT now() NOT NULL,
	"annullata_da" uuid,
	"annullata_il" timestamp with time zone,
	CONSTRAINT "distinte_bonifici_id_messaggio_unique" UNIQUE("id_messaggio")
);
--> statement-breakpoint
CREATE TABLE "app"."documenti_provvigioni" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"richiesta_id" uuid NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"anno" integer NOT NULL,
	"numero" integer NOT NULL,
	"tipo" "app"."tipo_documento" NOT NULL,
	"data" date NOT NULL,
	"imponibile" bigint NOT NULL,
	"iva" bigint NOT NULL,
	"aliquota_iva" integer NOT NULL,
	"ritenuta" bigint NOT NULL,
	"inps_base" bigint NOT NULL,
	"inps_incaricata" bigint NOT NULL,
	"inps_azienda" bigint NOT NULL,
	"bollo" bigint NOT NULL,
	"totale" bigint NOT NULL,
	"incaricata" jsonb NOT NULL,
	"azienda" jsonb NOT NULL,
	"competenza" text NOT NULL,
	"parametri_versione_id" bigint NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documenti_provvigioni_richiesta_id_unique" UNIQUE("richiesta_id")
);
--> statement-breakpoint
CREATE TABLE "app"."mesi_chiusi" (
	"mese" text PRIMARY KEY NOT NULL,
	"parametri_versione_id" bigint NOT NULL,
	"fotografia" jsonb NOT NULL,
	"punti_aziendali" bigint NOT NULL,
	"incasso" bigint NOT NULL,
	"totale_compensi" bigint NOT NULL,
	"chiuso_da" uuid,
	"chiuso_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."movimenti" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"tipo" "app"."tipo_movimento" NOT NULL,
	"mese" text NOT NULL,
	"tipo_voce" text,
	"base" bigint,
	"percentuale" integer,
	"importo" bigint NOT NULL,
	"origine_id" uuid,
	"rettifica_id" bigint,
	"richiesta_id" uuid,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."ordini_chiusi" (
	"ordine_id" uuid PRIMARY KEY NOT NULL,
	"mese" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."ordini_stornati" (
	"ordine_id" uuid PRIMARY KEY NOT NULL,
	"rettifica_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."rettifiche" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mese" text NOT NULL,
	"mese_origine" text NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."richieste_pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"mese" text NOT NULL,
	"lordo" bigint NOT NULL,
	"stato" "app"."stato_richiesta_pagamento" DEFAULT 'richiesta' NOT NULL,
	"data_pagamento" date NOT NULL,
	"decisa_da" uuid,
	"decisa_il" timestamp with time zone,
	"motivo_rifiuto" text,
	"pagata_da" uuid,
	"pagata_il" timestamp with time zone,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."righe_distinta" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"distinta_id" uuid NOT NULL,
	"richiesta_id" uuid NOT NULL,
	"annullata" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."versamenti_f24" (
	"periodo" text PRIMARY KEY NOT NULL,
	"importo" bigint NOT NULL,
	"versato_il" date NOT NULL,
	"registrato_da" uuid,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD COLUMN "regime_fiscale" "app"."regime_fiscale" DEFAULT 'nessuna_piva' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."distinte_bonifici" ADD CONSTRAINT "distinte_bonifici_creata_da_utenti_id_fk" FOREIGN KEY ("creata_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."distinte_bonifici" ADD CONSTRAINT "distinte_bonifici_annullata_da_utenti_id_fk" FOREIGN KEY ("annullata_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."documenti_provvigioni" ADD CONSTRAINT "documenti_provvigioni_richiesta_id_richieste_pagamento_id_fk" FOREIGN KEY ("richiesta_id") REFERENCES "app"."richieste_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."documenti_provvigioni" ADD CONSTRAINT "documenti_provvigioni_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."documenti_provvigioni" ADD CONSTRAINT "documenti_provvigioni_parametri_versione_id_parametri_versioni_id_fk" FOREIGN KEY ("parametri_versione_id") REFERENCES "app"."parametri_versioni"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mesi_chiusi" ADD CONSTRAINT "mesi_chiusi_parametri_versione_id_parametri_versioni_id_fk" FOREIGN KEY ("parametri_versione_id") REFERENCES "app"."parametri_versioni"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mesi_chiusi" ADD CONSTRAINT "mesi_chiusi_chiuso_da_utenti_id_fk" FOREIGN KEY ("chiuso_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."movimenti" ADD CONSTRAINT "movimenti_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."movimenti" ADD CONSTRAINT "movimenti_mese_mesi_chiusi_mese_fk" FOREIGN KEY ("mese") REFERENCES "app"."mesi_chiusi"("mese") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."movimenti" ADD CONSTRAINT "movimenti_origine_id_incaricati_id_fk" FOREIGN KEY ("origine_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."movimenti" ADD CONSTRAINT "movimenti_rettifica_id_rettifiche_id_fk" FOREIGN KEY ("rettifica_id") REFERENCES "app"."rettifiche"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."movimenti" ADD CONSTRAINT "movimenti_richiesta_id_richieste_pagamento_id_fk" FOREIGN KEY ("richiesta_id") REFERENCES "app"."richieste_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."ordini_chiusi" ADD CONSTRAINT "ordini_chiusi_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "app"."ordini"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."ordini_chiusi" ADD CONSTRAINT "ordini_chiusi_mese_mesi_chiusi_mese_fk" FOREIGN KEY ("mese") REFERENCES "app"."mesi_chiusi"("mese") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."ordini_stornati" ADD CONSTRAINT "ordini_stornati_ordine_id_ordini_chiusi_ordine_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "app"."ordini_chiusi"("ordine_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."ordini_stornati" ADD CONSTRAINT "ordini_stornati_rettifica_id_rettifiche_id_fk" FOREIGN KEY ("rettifica_id") REFERENCES "app"."rettifiche"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."rettifiche" ADD CONSTRAINT "rettifiche_mese_mesi_chiusi_mese_fk" FOREIGN KEY ("mese") REFERENCES "app"."mesi_chiusi"("mese") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."rettifiche" ADD CONSTRAINT "rettifiche_mese_origine_mesi_chiusi_mese_fk" FOREIGN KEY ("mese_origine") REFERENCES "app"."mesi_chiusi"("mese") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."richieste_pagamento" ADD CONSTRAINT "richieste_pagamento_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."richieste_pagamento" ADD CONSTRAINT "richieste_pagamento_mese_mesi_chiusi_mese_fk" FOREIGN KEY ("mese") REFERENCES "app"."mesi_chiusi"("mese") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."richieste_pagamento" ADD CONSTRAINT "richieste_pagamento_decisa_da_utenti_id_fk" FOREIGN KEY ("decisa_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."richieste_pagamento" ADD CONSTRAINT "richieste_pagamento_pagata_da_utenti_id_fk" FOREIGN KEY ("pagata_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."righe_distinta" ADD CONSTRAINT "righe_distinta_distinta_id_distinte_bonifici_id_fk" FOREIGN KEY ("distinta_id") REFERENCES "app"."distinte_bonifici"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."righe_distinta" ADD CONSTRAINT "righe_distinta_richiesta_id_richieste_pagamento_id_fk" FOREIGN KEY ("richiesta_id") REFERENCES "app"."richieste_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."versamenti_f24" ADD CONSTRAINT "versamenti_f24_registrato_da_utenti_id_fk" FOREIGN KEY ("registrato_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documenti_numero" ON "app"."documenti_provvigioni" USING btree ("incaricato_id","anno","numero");--> statement-breakpoint
CREATE INDEX "documenti_data" ON "app"."documenti_provvigioni" USING btree ("data");--> statement-breakpoint
CREATE INDEX "movimenti_incaricato" ON "app"."movimenti" USING btree ("incaricato_id","mese");--> statement-breakpoint
CREATE INDEX "movimenti_mese" ON "app"."movimenti" USING btree ("mese");--> statement-breakpoint
CREATE INDEX "ordini_chiusi_mese" ON "app"."ordini_chiusi" USING btree ("mese");--> statement-breakpoint
CREATE INDEX "richieste_pagamento_incaricato" ON "app"."richieste_pagamento" USING btree ("incaricato_id");--> statement-breakpoint
CREATE INDEX "richieste_pagamento_stato" ON "app"."richieste_pagamento" USING btree ("stato","data_pagamento");--> statement-breakpoint
CREATE INDEX "righe_distinta_distinta" ON "app"."righe_distinta" USING btree ("distinta_id");--> statement-breakpoint
-- ── Garanzie della Fase 6 (docs/garanzie-calcolo.md, sezione 3) ──
-- Regime fiscale: chi ha già la partita IVA parte dal regime ordinario; senza partita IVA solo "nessuna_piva".
UPDATE "app"."incaricati" SET "regime_fiscale" = 'piva_ordinaria' WHERE "partita_iva" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD CONSTRAINT "incaricati_regime_coerente"
  CHECK (("regime_fiscale" = 'nessuna_piva') = ("partita_iva" IS NULL));--> statement-breakpoint
-- Dati dell'azienda: una sola riga.
ALTER TABLE "app"."dati_azienda" ADD CONSTRAINT "dati_azienda_una_riga" CHECK ("id" = 1);--> statement-breakpoint
INSERT INTO "app"."dati_azienda" ("id") VALUES (1);--> statement-breakpoint
ALTER TABLE "app"."mesi_chiusi" ADD CONSTRAINT "mesi_chiusi_mese_valido" CHECK ("mese" ~ '^\d{4}-(0[1-9]|1[0-2])$');--> statement-breakpoint
-- Registro provvigioni: ogni tipo di movimento con il suo collegamento e il segno giusto.
ALTER TABLE "app"."movimenti" ADD CONSTRAINT "movimenti_coerenti" CHECK (
  ("tipo" = 'voce' AND "importo" > 0 AND "tipo_voce" IS NOT NULL AND "rettifica_id" IS NULL AND "richiesta_id" IS NULL)
  OR ("tipo" = 'storno' AND "importo" <> 0 AND "tipo_voce" IS NOT NULL AND "rettifica_id" IS NOT NULL AND "richiesta_id" IS NULL)
  OR ("tipo" = 'richiesta' AND "importo" < 0 AND "richiesta_id" IS NOT NULL AND "rettifica_id" IS NULL)
  OR ("tipo" = 'richiesta_rifiutata' AND "importo" > 0 AND "richiesta_id" IS NOT NULL AND "rettifica_id" IS NULL));--> statement-breakpoint
-- La stessa voce non si scrive due volte (mese + incaricata + tipo + origine); una richiesta si addebita e si restituisce una volta.
CREATE UNIQUE INDEX "movimenti_voce_unica" ON "app"."movimenti" ("mese", "incaricato_id", "tipo_voce", coalesce("origine_id"::text, ''))
  WHERE "tipo" = 'voce';--> statement-breakpoint
CREATE UNIQUE INDEX "movimenti_storno_unico" ON "app"."movimenti" ("rettifica_id", "incaricato_id", "tipo_voce", coalesce("origine_id"::text, ''))
  WHERE "tipo" = 'storno';--> statement-breakpoint
CREATE UNIQUE INDEX "movimenti_richiesta_unica" ON "app"."movimenti" ("richiesta_id", "tipo") WHERE "richiesta_id" IS NOT NULL;--> statement-breakpoint
-- Una richiesta di pagamento per incaricata per mese (una rifiutata non conta).
CREATE UNIQUE INDEX "richieste_pagamento_una_per_mese" ON "app"."richieste_pagamento" ("incaricato_id", "mese") WHERE "stato" <> 'rifiutata';--> statement-breakpoint
ALTER TABLE "app"."richieste_pagamento" ADD CONSTRAINT "richieste_pagamento_importo_valido" CHECK ("lordo" > 0);--> statement-breakpoint
-- Una richiesta in un solo file bonifici valido alla volta.
CREATE UNIQUE INDEX "righe_distinta_una_valida" ON "app"."righe_distinta" ("richiesta_id") WHERE NOT "annullata";--> statement-breakpoint
ALTER TABLE "app"."documenti_provvigioni" ADD CONSTRAINT "documenti_importi_coerenti" CHECK (
  "numero" > 0 AND "imponibile" > 0 AND "iva" >= 0 AND "ritenuta" >= 0 AND "inps_incaricata" >= 0 AND "inps_azienda" >= 0 AND "bollo" >= 0
  AND "totale" = "imponibile" + "iva" - "ritenuta" - "inps_incaricata" - "bollo");--> statement-breakpoint
-- Solo in aggiunta: mesi chiusi, ordini dei mesi chiusi, rettifiche, storni, movimenti, documenti, F24 versati.
CREATE TRIGGER "mesi_chiusi_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."mesi_chiusi" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE TRIGGER "ordini_chiusi_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."ordini_chiusi" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE TRIGGER "rettifiche_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."rettifiche" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE TRIGGER "ordini_stornati_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."ordini_stornati" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE TRIGGER "movimenti_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."movimenti" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE TRIGGER "documenti_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."documenti_provvigioni" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE TRIGGER "versamenti_f24_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."versamenti_f24" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
-- Richieste di pagamento: importo, incaricata, mese e data non cambiano; gli stati vanno solo avanti
-- (richiesta → approvata o rifiutata; approvata → pagata). Non si cancellano.
CREATE FUNCTION "app"."proteggi_richiesta_pagamento"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Le richieste di pagamento non si cancellano' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.incaricato_id <> OLD.incaricato_id OR NEW.mese <> OLD.mese OR NEW.lordo <> OLD.lordo
     OR NEW.data_pagamento <> OLD.data_pagamento OR NEW.creato_il <> OLD.creato_il THEN
    RAISE EXCEPTION 'Importo, incaricata e date di una richiesta non si modificano' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato IS DISTINCT FROM OLD.stato AND NOT (
       (OLD.stato = 'richiesta' AND NEW.stato IN ('approvata', 'rifiutata'))
    OR (OLD.stato = 'approvata' AND NEW.stato = 'pagata')) THEN
    RAISE EXCEPTION 'Passaggio di stato non ammesso: % → %', OLD.stato, NEW.stato USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato = OLD.stato AND (NEW.decisa_il IS DISTINCT FROM OLD.decisa_il OR NEW.pagata_il IS DISTINCT FROM OLD.pagata_il) THEN
    RAISE EXCEPTION 'Le date di decisione e pagamento cambiano solo con lo stato' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "richieste_pagamento_protette" BEFORE UPDATE OR DELETE ON "app"."richieste_pagamento"
  FOR EACH ROW EXECUTE FUNCTION "app"."proteggi_richiesta_pagamento"();--> statement-breakpoint
-- File bonifici: si possono solo annullare (una volta); le righe solo segnare come annullate.
CREATE FUNCTION "app"."proteggi_distinta"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'I file bonifici non si cancellano: si annullano' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_TABLE_NAME = 'distinte_bonifici' THEN
    IF OLD.annullata_il IS NOT NULL OR NEW.annullata_il IS NULL
       OR (to_jsonb(NEW) - 'annullata_il' - 'annullata_da') <> (to_jsonb(OLD) - 'annullata_il' - 'annullata_da') THEN
      RAISE EXCEPTION 'Un file bonifici si può solo annullare, una volta' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF OLD.annullata OR NOT NEW.annullata OR NEW.distinta_id <> OLD.distinta_id OR NEW.richiesta_id <> OLD.richiesta_id THEN
    RAISE EXCEPTION 'Una riga del file bonifici si può solo annullare' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "distinte_protette" BEFORE UPDATE OR DELETE ON "app"."distinte_bonifici" FOR EACH ROW EXECUTE FUNCTION "app"."proteggi_distinta"();--> statement-breakpoint
CREATE TRIGGER "righe_distinta_protette" BEFORE UPDATE OR DELETE ON "app"."righe_distinta" FOR EACH ROW EXECUTE FUNCTION "app"."proteggi_distinta"();--> statement-breakpoint
-- Row Level Security anche sulle tabelle nuove (seconda barriera, come nella migrazione 0004).
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
