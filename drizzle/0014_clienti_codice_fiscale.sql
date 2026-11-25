DROP INDEX "app"."clienti_email";--> statement-breakpoint
ALTER TABLE "app"."clienti" ADD COLUMN "codice_fiscale" text;--> statement-breakpoint
CREATE UNIQUE INDEX "clienti_codice_fiscale" ON "app"."clienti" USING btree ("codice_fiscale") WHERE "app"."clienti"."codice_fiscale" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "clienti_email_senza_codice_fiscale" ON "app"."clienti" USING btree ("email") WHERE "app"."clienti"."codice_fiscale" is null;--> statement-breakpoint
CREATE INDEX "clienti_email" ON "app"."clienti" USING btree ("email");--> statement-breakpoint
-- Decisione 36: il cliente si riconosce dal codice fiscale (16 caratteri, maiuscolo).
ALTER TABLE "app"."clienti" ADD CONSTRAINT "clienti_codice_fiscale_formato" CHECK ("codice_fiscale" IS NULL OR "codice_fiscale" ~ '^[A-Z0-9]{16}$');--> statement-breakpoint
-- Il codice fiscale si scrive una volta (anche dopo, per i clienti nati prima); dopo lo corregge solo la sede, con motivo.
CREATE OR REPLACE FUNCTION "app"."proteggi_cliente"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'I clienti non si cancellano' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email OR NEW.creato_il IS DISTINCT FROM OLD.creato_il THEN
    RAISE EXCEPTION 'Email e identità di un cliente non si modificano' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.codice_fiscale IS NOT NULL AND NEW.codice_fiscale IS DISTINCT FROM OLD.codice_fiscale
     AND current_setting('app.correggi_codice_fiscale', true) IS DISTINCT FROM 'tracciato' THEN
    RAISE EXCEPTION 'Il codice fiscale di un cliente lo corregge solo la sede, con motivo' USING ERRCODE = 'check_violation';
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
