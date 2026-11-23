ALTER TYPE "app"."ruolo" ADD VALUE IF NOT EXISTS 'cliente';--> statement-breakpoint
DROP INDEX "app"."utenti_email_staff";--> statement-breakpoint
ALTER TABLE "app"."clienti" ALTER COLUMN "incaricato_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."clienti" ALTER COLUMN "privacy_accettata_il" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD COLUMN "utente_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD COLUMN "indirizzo" text;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD COLUMN "cap" text;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD COLUMN "citta" text;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD COLUMN "provincia" text;--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD COLUMN "mostra_contatti_clienti" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."richieste_contatto" ADD COLUMN "tipo" text DEFAULT 'incaricata' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."richieste_contatto" ADD COLUMN "cliente_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD CONSTRAINT "clienti_utente_id_utenti_id_fk" FOREIGN KEY ("utente_id") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."richieste_contatto" ADD CONSTRAINT "richieste_contatto_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "app"."clienti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "utenti_email_clienti" ON "app"."utenti" USING btree (lower("email")) WHERE "app"."utenti"."ruolo" not in ('incaricato', 'amministrazione', 'contabilita', 'ordini');--> statement-breakpoint
CREATE UNIQUE INDEX "utenti_email_staff" ON "app"."utenti" USING btree (lower("email")) WHERE "app"."utenti"."ruolo" in ('amministrazione', 'contabilita', 'ordini');--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD CONSTRAINT "clienti_utente_id_unique" UNIQUE("utente_id");--> statement-breakpoint
-- Garanzie della decisione 32.
ALTER TABLE "app"."richieste_contatto" ADD CONSTRAINT "richieste_contatto_tipo_valido"
  CHECK ("tipo" IN ('incaricata', 'cliente') AND ("tipo" = 'cliente') = ("cliente_id" IS NOT NULL));--> statement-breakpoint
-- Un cliente senza consulente si lega la prima volta (codice al primo acquisto o assegnazione della sede); dopo,
-- il legame cambia solo come intervento tracciato della sede e non torna mai vuoto.
CREATE OR REPLACE FUNCTION "app"."proteggi_cliente"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'I clienti non si cancellano' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email OR NEW.creato_il IS DISTINCT FROM OLD.creato_il THEN
    RAISE EXCEPTION 'Email e identità di un cliente non si modificano' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.incaricato_id IS NOT NULL AND NEW.incaricato_id IS NULL THEN
    RAISE EXCEPTION 'Un cliente legato a un''incaricata non torna senza consulente' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.incaricato_id IS NOT NULL AND NEW.incaricato_id IS DISTINCT FROM OLD.incaricato_id
     AND current_setting('app.sposta_cliente', true) IS DISTINCT FROM 'tracciato' THEN
    RAISE EXCEPTION 'Il cliente resta legato alla sua incaricata: solo la sede può spostarlo, con motivo' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.utente_id IS NOT NULL AND NEW.utente_id IS DISTINCT FROM OLD.utente_id THEN
    RAISE EXCEPTION 'Il profilo di un cliente non si scambia' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
