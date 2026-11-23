CREATE TABLE "app"."avvisi_vip" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"valida_fino" date NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."avvisi_vip" ADD CONSTRAINT "avvisi_vip_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "app"."clienti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avvisi_vip_unico" ON "app"."avvisi_vip" USING btree ("cliente_id","valida_fino");--> statement-breakpoint
-- Avvisi VIP solo in aggiunta (come gli avvisi della licenza) e Row Level Security anche qui.
CREATE TRIGGER "avvisi_vip_solo_aggiunta" BEFORE UPDATE OR DELETE ON "app"."avvisi_vip" FOR EACH ROW EXECUTE FUNCTION "app"."vieta_modifica"();--> statement-breakpoint
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
