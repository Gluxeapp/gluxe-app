-- Annulla la migrazione 0008 (Fase 7, negozio online). ATTENZIONE: cancella clienti e legami; gli ordini online
-- restano ma perdono il collegamento al cliente. Sul database vero solo prima dei primi ordini dal negozio.
CREATE OR REPLACE FUNCTION "app"."proteggi_ordine"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Gli ordini non si cancellano: si annullano' USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.id, NEW.numero, NEW.incaricato_id, NEW.tipo, NEW.parametri_versione_id,
      NEW.merce_iva_inclusa, NEW.merce_iva_esclusa, NEW.punti, NEW.provvigione_acquisto,
      NEW.spese_spedizione, NEW.totale, NEW.creato_il, NEW.riordino_confermato_il)
     IS DISTINCT FROM
     (OLD.id, OLD.numero, OLD.incaricato_id, OLD.tipo, OLD.parametri_versione_id,
      OLD.merce_iva_inclusa, OLD.merce_iva_esclusa, OLD.punti, OLD.provvigione_acquisto,
      OLD.spese_spedizione, OLD.totale, OLD.creato_il, OLD.riordino_confermato_il) THEN
    RAISE EXCEPTION 'Importi, punti e dati fotografati di un ordine non si modificano' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.pagato_il IS NOT NULL AND (NEW.pagato_il IS DISTINCT FROM OLD.pagato_il
      OR NEW.stripe_pagamento_id IS DISTINCT FROM OLD.stripe_pagamento_id) THEN
    RAISE EXCEPTION 'Un ordine pagato non può cambiare data o codice di pagamento' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
ALTER TABLE "app"."ordini" DROP CONSTRAINT IF EXISTS "ordini_cliente_coerente";
ALTER TABLE "app"."ordini" DROP CONSTRAINT IF EXISTS "ordini_cliente_id_clienti_id_fk";
ALTER TABLE "app"."ordini" DROP CONSTRAINT IF EXISTS "ordini_accesso_cliente_impronta_unique";
DROP INDEX IF EXISTS "app"."ordini_cliente";
DROP INDEX IF EXISTS "app"."ordini_metodo_impronta";
ALTER TABLE "app"."ordini" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "app"."ordini" DROP COLUMN IF EXISTS "accesso_cliente_impronta";
ALTER TABLE "app"."ordini" DROP COLUMN IF EXISTS "metodo_impronta";
DROP TABLE IF EXISTS "app"."storico_legami_clienti";
DROP TABLE IF EXISTS "app"."clienti";
DROP FUNCTION IF EXISTS "app"."proteggi_cliente"();
