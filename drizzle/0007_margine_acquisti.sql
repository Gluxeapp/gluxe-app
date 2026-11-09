ALTER TABLE "app"."righe_ordine" ADD COLUMN "listino_unitario_ivato" bigint;--> statement-breakpoint
-- Prezzo di listino fotografato nelle righe d'ordine (per il margine sugli acquisti personali): mai negativo.
ALTER TABLE "app"."righe_ordine" ADD CONSTRAINT "righe_ordine_listino_valido" CHECK ("listino_unitario_ivato" IS NULL OR "listino_unitario_ivato" >= 0);
