-- Annulla la migrazione 0009 (licenza annuale). ATTENZIONE: cancella i periodi di licenza e gli avvisi registrati.
-- Il valore 'licenza' resta nei tipi di ordine, prodotto e riga (PostgreSQL non permette di toglierlo): è innocuo.
-- Gli ordini di rinnovo già fatti restano (gli ordini non si cancellano).
ALTER TABLE "app"."ordini" DROP CONSTRAINT IF EXISTS "ordini_licenza_senza_punti";
DROP TABLE IF EXISTS "app"."avvisi_licenza";
DROP TABLE IF EXISTS "app"."licenze";
ALTER TABLE "app"."incaricati" DROP COLUMN IF EXISTS "licenza_esente";
