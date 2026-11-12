-- Annulla la migrazione 0010 (ordine per un cliente e profilo cliente). ATTENZIONE: i clienti senza consulente o
-- senza informativa accettata impediscono di rimettere i campi obbligatori: in quel caso l'annullamento si ferma.
-- Gli account dei clienti (utenti con ruolo "cliente") restano ma non possono più accedere; il valore 'cliente' resta nel tipo.
CREATE OR REPLACE FUNCTION "app"."proteggi_cliente"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'I clienti non si cancellano' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email OR NEW.creato_il IS DISTINCT FROM OLD.creato_il THEN
    RAISE EXCEPTION 'Email e identità di un cliente non si modificano' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.incaricato_id IS DISTINCT FROM OLD.incaricato_id
     AND current_setting('app.sposta_cliente', true) IS DISTINCT FROM 'tracciato' THEN
    RAISE EXCEPTION 'Il cliente resta legato alla sua incaricata: solo la sede può spostarlo, con motivo' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
ALTER TABLE "app"."richieste_contatto" DROP CONSTRAINT IF EXISTS "richieste_contatto_tipo_valido";
ALTER TABLE "app"."richieste_contatto" DROP CONSTRAINT IF EXISTS "richieste_contatto_cliente_id_clienti_id_fk";
ALTER TABLE "app"."richieste_contatto" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "app"."richieste_contatto" DROP COLUMN IF EXISTS "tipo";
ALTER TABLE "app"."incaricati" DROP COLUMN IF EXISTS "mostra_contatti_clienti";
ALTER TABLE "app"."clienti" DROP CONSTRAINT IF EXISTS "clienti_utente_id_unique";
ALTER TABLE "app"."clienti" DROP CONSTRAINT IF EXISTS "clienti_utente_id_utenti_id_fk";
ALTER TABLE "app"."clienti" DROP COLUMN IF EXISTS "utente_id";
ALTER TABLE "app"."clienti" DROP COLUMN IF EXISTS "indirizzo";
ALTER TABLE "app"."clienti" DROP COLUMN IF EXISTS "cap";
ALTER TABLE "app"."clienti" DROP COLUMN IF EXISTS "citta";
ALTER TABLE "app"."clienti" DROP COLUMN IF EXISTS "provincia";
ALTER TABLE "app"."clienti" ALTER COLUMN "incaricato_id" SET NOT NULL;
ALTER TABLE "app"."clienti" ALTER COLUMN "privacy_accettata_il" SET NOT NULL;
DROP INDEX IF EXISTS "app"."utenti_email_clienti";
DROP INDEX IF EXISTS "app"."utenti_email_staff";
CREATE UNIQUE INDEX "utenti_email_staff" ON "app"."utenti" USING btree (lower("email")) WHERE "ruolo" <> 'incaricato';
