-- Annulla la migrazione 0007: sparisce il prezzo di listino fotografato nelle righe d'ordine (il margine torna a usare il listino attuale del prodotto).
ALTER TABLE "app"."righe_ordine" DROP CONSTRAINT IF EXISTS "righe_ordine_listino_valido";
ALTER TABLE "app"."righe_ordine" DROP COLUMN IF EXISTS "listino_unitario_ivato";
