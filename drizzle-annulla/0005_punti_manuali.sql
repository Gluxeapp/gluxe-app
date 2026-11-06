-- Annulla la migrazione 0005: i punti scritti a mano spariscono e torna il calcolo automatico (gli ordini già fatti restano fotografati).
ALTER TABLE "app"."prodotti" DROP COLUMN IF EXISTS "punti_personale_manuali";
ALTER TABLE "app"."prodotti" DROP COLUMN IF EXISTS "punti_online_manuali";
ALTER TABLE "app"."promozioni" DROP COLUMN IF EXISTS "punti_manuali";
