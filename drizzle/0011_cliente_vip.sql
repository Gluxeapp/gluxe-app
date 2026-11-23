CREATE TYPE "app"."tipo_voce_vip" AS ENUM('attivazione', 'rinnovo', 'revoca');--> statement-breakpoint
ALTER TYPE "app"."tipo_prezzo_riga" ADD VALUE IF NOT EXISTS 'listino_vip';--> statement-breakpoint
CREATE TABLE "app"."registro_vip" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo" "app"."tipo_voce_vip" NOT NULL,
	"ordine_id" uuid NOT NULL,
	"giorno" date NOT NULL,
	"valida_fino" date,
	"revoca_di" bigint,
	"prodotti_pagati" bigint NOT NULL,
	"prodotti_listino" bigint NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."registro_vip" ADD CONSTRAINT "registro_vip_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "app"."clienti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."registro_vip" ADD CONSTRAINT "registro_vip_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "app"."ordini"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."registro_vip" ADD CONSTRAINT "registro_vip_revoca_di_registro_vip_id_fk" FOREIGN KEY ("revoca_di") REFERENCES "app"."registro_vip"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registro_vip_cliente" ON "app"."registro_vip" USING btree ("cliente_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "registro_vip_ordine" ON "app"."registro_vip" USING btree ("ordine_id") WHERE "app"."registro_vip"."tipo" <> 'revoca';--> statement-breakpoint
CREATE UNIQUE INDEX "registro_vip_revoca" ON "app"."registro_vip" USING btree ("revoca_di");--> statement-breakpoint
-- Garanzie del Cliente VIP (decisione 35).
-- Registro solo in aggiunta; attivazioni e rinnovi hanno una scadenza, le revoche indicano la voce annullata.
ALTER TABLE "app"."registro_vip" ADD CONSTRAINT "registro_vip_voce_coerente" CHECK (
  ("tipo"::text = 'revoca' AND "revoca_di" IS NOT NULL AND "valida_fino" IS NULL)
  OR ("tipo"::text <> 'revoca' AND "revoca_di" IS NULL AND "valida_fino" IS NOT NULL AND "valida_fino" >= "giorno")
);--> statement-breakpoint
ALTER TABLE "app"."registro_vip" ADD CONSTRAINT "registro_vip_importi_positivi" CHECK ("prodotti_pagati" >= 0 AND "prodotti_listino" >= 0);--> statement-breakpoint
CREATE TRIGGER "registro_vip_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."registro_vip" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
-- Row Level Security anche sulla tabella nuova (seconda barriera, come nelle migrazioni precedenti).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'app' LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA app FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM anon, authenticated';
  END IF;
END;
$$;
