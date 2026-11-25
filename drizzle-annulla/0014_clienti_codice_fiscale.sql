-- Annulla la migrazione 0014 (cliente riconosciuto dal codice fiscale, decisione 36). ATTENZIONE: si perdono i codici
-- fiscali dei clienti. Si può annullare solo se nessuna email è usata da due clienti (torna l'email unica): se ce ne
-- sono, il comando si ferma e prima vanno sistemati a mano.
DROP INDEX IF EXISTS "app"."clienti_email";
DROP INDEX IF EXISTS "app"."clienti_email_senza_codice_fiscale";
DROP INDEX IF EXISTS "app"."clienti_codice_fiscale";
ALTER TABLE "app"."clienti" DROP CONSTRAINT IF EXISTS "clienti_codice_fiscale_formato";
CREATE UNIQUE INDEX "clienti_email" ON "app"."clienti" USING btree ("email");
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
ALTER TABLE "app"."clienti" DROP COLUMN IF EXISTS "codice_fiscale";
