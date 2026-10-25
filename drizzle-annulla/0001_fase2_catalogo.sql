-- Annulla la migrazione 0001_fase2_catalogo (catalogo e parametri).
-- ATTENZIONE: cancella prodotti, promozioni, foto e versioni dei parametri.
DROP TABLE IF EXISTS "app"."promozioni";
DROP TABLE IF EXISTS "app"."prodotti";
DROP TABLE IF EXISTS "app"."immagini";
DROP TABLE IF EXISTS "app"."parametri_versioni";
DROP TYPE IF EXISTS "app"."tipo_prodotto";
