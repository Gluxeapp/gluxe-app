-- Annulla la migrazione 0013 (candidature delle clienti). Le candidature già ricevute restano, ma il vecchio controllo
-- vale solo per le richieste nuove (NOT VALID); il messaggio delle candidature si perde.
ALTER TABLE "app"."richieste_contatto" DROP CONSTRAINT IF EXISTS "richieste_contatto_messaggio_breve";
ALTER TABLE "app"."richieste_contatto" DROP CONSTRAINT IF EXISTS "richieste_contatto_tipo_valido";
ALTER TABLE "app"."richieste_contatto" ADD CONSTRAINT "richieste_contatto_tipo_valido"
  CHECK ("tipo" IN ('incaricata', 'cliente') AND ("tipo" = 'cliente') = ("cliente_id" IS NOT NULL)) NOT VALID;
ALTER TABLE "app"."richieste_contatto" DROP COLUMN IF EXISTS "messaggio";
