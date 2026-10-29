-- Annulla la migrazione 0003_garanzie_immutabilita (protezioni del database).
-- Non tocca nessun dato: toglie solo i blocchi su modifiche e cancellazioni.
ALTER TABLE "app"."rimborsi" DROP CONSTRAINT IF EXISTS "rimborsi_importo_positivo";
ALTER TABLE "app"."righe_ordine" DROP CONSTRAINT IF EXISTS "righe_ordine_valori_validi";
ALTER TABLE "app"."ordini" DROP CONSTRAINT IF EXISTS "ordini_importi_validi";
DROP INDEX IF EXISTS "app"."ordini_stripe_pagamento_unico";
DROP TRIGGER IF EXISTS "registro_modifiche_solo_aggiunta" ON "app"."registro_modifiche";
DROP TRIGGER IF EXISTS "rimborsi_solo_aggiunta" ON "app"."rimborsi";
DROP TRIGGER IF EXISTS "eventi_stripe_solo_aggiunta" ON "app"."eventi_stripe";
DROP TRIGGER IF EXISTS "storico_stati_solo_aggiunta" ON "app"."storico_stati_ordine";
DROP TRIGGER IF EXISTS "righe_ordine_solo_aggiunta" ON "app"."righe_ordine";
DROP TRIGGER IF EXISTS "ordini_protetti" ON "app"."ordini";
DROP FUNCTION IF EXISTS "app"."proteggi_ordine"();
DROP FUNCTION IF EXISTS "app"."vieta_modifica"();
