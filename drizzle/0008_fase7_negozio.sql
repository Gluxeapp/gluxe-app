CREATE TABLE "app"."clienti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"cognome" text NOT NULL,
	"telefono" text NOT NULL,
	"consenso_contatti_il" timestamp with time zone,
	"privacy_accettata_il" timestamp with time zone NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."storico_legami_clienti" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"dal" timestamp with time zone DEFAULT now() NOT NULL,
	"motivo" text NOT NULL,
	"modificato_da" uuid
);
--> statement-breakpoint
ALTER TABLE "app"."ordini" ADD COLUMN "cliente_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."ordini" ADD COLUMN "accesso_cliente_impronta" text;--> statement-breakpoint
ALTER TABLE "app"."ordini" ADD COLUMN "metodo_impronta" text;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD CONSTRAINT "clienti_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_legami_clienti" ADD CONSTRAINT "storico_legami_clienti_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "app"."clienti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_legami_clienti" ADD CONSTRAINT "storico_legami_clienti_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_legami_clienti" ADD CONSTRAINT "storico_legami_clienti_modificato_da_utenti_id_fk" FOREIGN KEY ("modificato_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clienti_email" ON "app"."clienti" USING btree ("email");--> statement-breakpoint
CREATE INDEX "clienti_incaricato" ON "app"."clienti" USING btree ("incaricato_id");--> statement-breakpoint
CREATE INDEX "storico_legami_clienti_cliente" ON "app"."storico_legami_clienti" USING btree ("cliente_id");--> statement-breakpoint
ALTER TABLE "app"."ordini" ADD CONSTRAINT "ordini_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "app"."clienti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ordini_cliente" ON "app"."ordini" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "ordini_metodo_impronta" ON "app"."ordini" USING btree ("metodo_impronta");--> statement-breakpoint
ALTER TABLE "app"."ordini" ADD CONSTRAINT "ordini_accesso_cliente_impronta_unique" UNIQUE("accesso_cliente_impronta");--> statement-breakpoint
-- Garanzie della Fase 7 (decisione 29).
-- Ordini online sempre con il cliente, e solo loro. NOT VALID: gli ordini online finti già presenti nel database
-- di prova (senza cliente) restano; vale per tutti gli ordini nuovi e per ogni modifica.
ALTER TABLE "app"."ordini" ADD CONSTRAINT "ordini_cliente_coerente"
  CHECK (("tipo" = 'online') = ("cliente_id" IS NOT NULL)) NOT VALID;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD CONSTRAINT "clienti_email_minuscola" CHECK ("email" = lower("email") AND "email" LIKE '%_@_%');--> statement-breakpoint
CREATE TRIGGER "storico_legami_clienti_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."storico_legami_clienti"
  FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
CREATE FUNCTION "app"."proteggi_cliente"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'I clienti non si cancellano' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email OR NEW.creato_il IS DISTINCT FROM OLD.creato_il THEN
    RAISE EXCEPTION 'Email e identità di un cliente non si modificano' USING ERRCODE = 'check_violation';
  END IF;
  -- Il legame con l'incaricata si cambia solo come intervento tracciato della sede (storico e registro modifiche).
  IF NEW.incaricato_id IS DISTINCT FROM OLD.incaricato_id
     AND current_setting('app.sposta_cliente', true) IS DISTINCT FROM 'tracciato' THEN
    RAISE EXCEPTION 'Il cliente resta legato alla sua incaricata: solo la sede può spostarlo, con motivo' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "clienti_protetti" BEFORE UPDATE OR DELETE ON "app"."clienti" FOR EACH ROW EXECUTE FUNCTION "app"."proteggi_cliente"();--> statement-breakpoint
-- Il cliente di un ordine è fotografato come l'incaricata: spostare un cliente vale solo per gli ordini futuri.
CREATE OR REPLACE FUNCTION "app"."proteggi_ordine"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Gli ordini non si cancellano: si annullano' USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.id, NEW.numero, NEW.incaricato_id, NEW.tipo, NEW.parametri_versione_id,
      NEW.merce_iva_inclusa, NEW.merce_iva_esclusa, NEW.punti, NEW.provvigione_acquisto,
      NEW.spese_spedizione, NEW.totale, NEW.creato_il, NEW.riordino_confermato_il,
      NEW.cliente_id, NEW.accesso_cliente_impronta)
     IS DISTINCT FROM
     (OLD.id, OLD.numero, OLD.incaricato_id, OLD.tipo, OLD.parametri_versione_id,
      OLD.merce_iva_inclusa, OLD.merce_iva_esclusa, OLD.punti, OLD.provvigione_acquisto,
      OLD.spese_spedizione, OLD.totale, OLD.creato_il, OLD.riordino_confermato_il,
      OLD.cliente_id, OLD.accesso_cliente_impronta) THEN
    RAISE EXCEPTION 'Importi, punti e dati fotografati di un ordine non si modificano' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.pagato_il IS NOT NULL AND (NEW.pagato_il IS DISTINCT FROM OLD.pagato_il
      OR NEW.stripe_pagamento_id IS DISTINCT FROM OLD.stripe_pagamento_id) THEN
    RAISE EXCEPTION 'Un ordine pagato non può cambiare data o codice di pagamento' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
-- Row Level Security anche sulle tabelle nuove (seconda barriera, come nelle migrazioni 0004 e 0006).
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