-- Annulla la migrazione 0006 (Fase 6). ATTENZIONE: cancella mesi chiusi, registro provvigioni, richieste,
-- documenti, file bonifici e F24 registrati. Sul database vero solo prima che si chiuda il primo mese.
-- Le righe aggiunte al registro modifiche restano: il registro è solo in aggiunta.
DROP TABLE IF EXISTS "app"."righe_distinta";
DROP TABLE IF EXISTS "app"."distinte_bonifici";
DROP TABLE IF EXISTS "app"."documenti_provvigioni";
DROP TABLE IF EXISTS "app"."movimenti";
DROP TABLE IF EXISTS "app"."richieste_pagamento";
DROP TABLE IF EXISTS "app"."ordini_stornati";
DROP TABLE IF EXISTS "app"."rettifiche";
DROP TABLE IF EXISTS "app"."ordini_chiusi";
DROP TABLE IF EXISTS "app"."mesi_chiusi";
DROP TABLE IF EXISTS "app"."versamenti_f24";
DROP TABLE IF EXISTS "app"."dati_azienda";
DROP FUNCTION IF EXISTS "app"."proteggi_richiesta_pagamento"();
DROP FUNCTION IF EXISTS "app"."proteggi_distinta"();
ALTER TABLE "app"."incaricati" DROP CONSTRAINT IF EXISTS "incaricati_regime_coerente";
ALTER TABLE "app"."incaricati" DROP COLUMN IF EXISTS "regime_fiscale";
DROP TYPE IF EXISTS "app"."regime_fiscale";
DROP TYPE IF EXISTS "app"."tipo_documento";
DROP TYPE IF EXISTS "app"."tipo_movimento";
DROP TYPE IF EXISTS "app"."stato_richiesta_pagamento";
