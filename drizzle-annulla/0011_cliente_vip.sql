-- Annulla la migrazione 0011 (Cliente VIP). ATTENZIONE: cancella il registro dello status VIP delle clienti.
-- Il valore 'listino_vip' resta nei tipi di riga (PostgreSQL non permette di toglierlo): è innocuo.
-- Gli ordini già fatti con il prezzo VIP restano come sono (gli ordini non si cancellano).
DROP TABLE IF EXISTS "app"."registro_vip";
DROP TYPE IF EXISTS "app"."tipo_voce_vip";
