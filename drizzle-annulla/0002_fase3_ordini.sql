-- Annulla la migrazione 0002_fase3_ordini (ordini e pagamenti Stripe).
-- ATTENZIONE: cancella ordini, righe, storico stati, eventi Stripe e rimborsi.
-- Il segno "start kit pagato" delle incaricate resta com'è.
-- Fallisce (e non cambia nulla) se esiste ancora un account staff con ruolo "ordini": va prima tolto.
DROP TABLE IF EXISTS "app"."rimborsi";
DROP TABLE IF EXISTS "app"."storico_stati_ordine";
DROP TABLE IF EXISTS "app"."righe_ordine";
DROP TABLE IF EXISTS "app"."ordini";
DROP TABLE IF EXISTS "app"."eventi_stripe";
DROP SEQUENCE IF EXISTS "app"."sequenza_numero_ordine";
DROP TYPE IF EXISTS "app"."tipo_prezzo_riga";
DROP TYPE IF EXISTS "app"."tipo_ordine";
DROP TYPE IF EXISTS "app"."stato_ordine";
-- PostgreSQL non permette di togliere un valore da un elenco: si ricrea l'elenco dei ruoli senza "ordini".
DROP INDEX IF EXISTS "app"."utenti_email_staff";
DROP INDEX IF EXISTS "app"."utenti_email_incaricati";
ALTER TYPE "app"."ruolo" RENAME TO "ruolo_vecchio";
CREATE TYPE "app"."ruolo" AS ENUM('incaricato', 'amministrazione', 'contabilita');
ALTER TABLE "app"."utenti" ALTER COLUMN "ruolo" TYPE "app"."ruolo" USING "ruolo"::text::"app"."ruolo";
DROP TYPE "app"."ruolo_vecchio";
CREATE UNIQUE INDEX "utenti_email_staff" ON "app"."utenti" USING btree (lower("email")) WHERE "utenti"."ruolo" <> 'incaricato';
CREATE UNIQUE INDEX "utenti_email_incaricati" ON "app"."utenti" USING btree (lower("email")) WHERE "utenti"."ruolo" = 'incaricato';
