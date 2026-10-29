-- Garanzie a livello di database (docs/garanzie-calcolo.md): valgono qualunque cosa faccia il codice.
-- Un ordine è "fotografato": importi, punti, incaricata, versione del piano e righe non cambiano mai.
-- La data di pagamento (che decide il mese di competenza) si scrive una volta sola.
-- Storici, eventi Stripe, rimborsi e registro modifiche sono solo in aggiunta.

CREATE FUNCTION "app"."vieta_modifica"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabella % è solo in aggiunta: righe non modificabili né cancellabili', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "app"."proteggi_ordine"() RETURNS trigger LANGUAGE plpgsql AS $$
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
--> statement-breakpoint
CREATE TRIGGER "ordini_protetti" BEFORE UPDATE OR DELETE ON "app"."ordini"
  FOR EACH ROW EXECUTE FUNCTION "app"."proteggi_ordine"();
--> statement-breakpoint
CREATE TRIGGER "righe_ordine_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."righe_ordine"
  FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();
--> statement-breakpoint
CREATE TRIGGER "storico_stati_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."storico_stati_ordine"
  FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();
--> statement-breakpoint
CREATE TRIGGER "eventi_stripe_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."eventi_stripe"
  FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();
--> statement-breakpoint
CREATE TRIGGER "rimborsi_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."rimborsi"
  FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();
--> statement-breakpoint
CREATE TRIGGER "registro_modifiche_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."registro_modifiche"
  FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();
--> statement-breakpoint
-- Un pagamento Stripe vale per un solo ordine.
CREATE UNIQUE INDEX "ordini_stripe_pagamento_unico" ON "app"."ordini" ("stripe_pagamento_id")
  WHERE "stripe_pagamento_id" IS NOT NULL;
--> statement-breakpoint
-- Importi e quantità mai negativi o nulli.
ALTER TABLE "app"."ordini" ADD CONSTRAINT "ordini_importi_validi"
  CHECK ("merce_iva_inclusa" >= 0 AND "merce_iva_esclusa" >= 0 AND "punti" >= 0
         AND "provvigione_acquisto" >= 0 AND "spese_spedizione" >= 0
         AND "totale" = "merce_iva_inclusa" + "spese_spedizione");
--> statement-breakpoint
ALTER TABLE "app"."righe_ordine" ADD CONSTRAINT "righe_ordine_valori_validi"
  CHECK ("quantita" BETWEEN 1 AND 99
         AND "totale_ivato" = "prezzo_unitario_ivato" * "quantita"
         AND "totale_iva_esclusa" = "prezzo_unitario_iva_esclusa" * "quantita"
         AND "totale_punti" = "punti_unitari" * "quantita"
         AND "totale_provvigione" = "provvigione_unitaria" * "quantita");
--> statement-breakpoint
ALTER TABLE "app"."rimborsi" ADD CONSTRAINT "rimborsi_importo_positivo" CHECK ("importo" > 0);
