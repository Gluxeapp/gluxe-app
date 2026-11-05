-- Annulla la migrazione 0004 (Fase 4). Le righe aggiunte al registro modifiche restano: il registro è solo in aggiunta.
UPDATE "app"."prodotti" SET "prezzo_listino" = 3290 WHERE "codice" = 'HB-SH';
DELETE FROM "app"."parametri_versioni" WHERE "note" = 'Piano Compensi rev. 6';
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'app' LOOP
    EXECUTE format('ALTER TABLE app.%I DISABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END;
$$;
DROP TRIGGER IF EXISTS "sponsor_protetto" ON "app"."incaricati";
DROP FUNCTION IF EXISTS "app"."proteggi_sponsor"();
DROP TABLE IF EXISTS "app"."quote_speciali";
DROP TABLE IF EXISTS "app"."qualifiche_bloccate";
DROP TABLE IF EXISTS "app"."leader_fondatori";
DROP TYPE IF EXISTS "app"."tipo_quota_speciale";
ALTER TABLE "app"."incaricati" DROP COLUMN IF EXISTS "esclusa_pool";
ALTER TABLE "app"."incaricati" DROP COLUMN IF EXISTS "esclusa_bonus_auto";
