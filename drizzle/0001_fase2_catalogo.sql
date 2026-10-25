CREATE TYPE "app"."tipo_prodotto" AS ENUM('prodotto', 'start_kit');--> statement-breakpoint
CREATE TABLE "app"."immagini" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"dati" text NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."parametri_versioni" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"valido_dal" date NOT NULL,
	"valori" jsonb NOT NULL,
	"note" text,
	"creato_da" uuid,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."prodotti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codice" text NOT NULL,
	"nome" text NOT NULL,
	"linea" text,
	"formato" text,
	"descrizione" text,
	"tipo" "app"."tipo_prodotto" DEFAULT 'prodotto' NOT NULL,
	"prezzo_listino" bigint NOT NULL,
	"immagine_id" uuid,
	"attivo" boolean DEFAULT true NOT NULL,
	"ordine" integer DEFAULT 0 NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prodotti_codice_unique" UNIQUE("codice")
);
--> statement-breakpoint
CREATE TABLE "app"."promozioni" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prodotto_id" uuid NOT NULL,
	"titolo" text NOT NULL,
	"prezzo_promo" bigint NOT NULL,
	"dal" date NOT NULL,
	"al" date NOT NULL,
	"attiva" boolean DEFAULT true NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."parametri_versioni" ADD CONSTRAINT "parametri_versioni_creato_da_utenti_id_fk" FOREIGN KEY ("creato_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."prodotti" ADD CONSTRAINT "prodotti_immagine_id_immagini_id_fk" FOREIGN KEY ("immagine_id") REFERENCES "app"."immagini"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promozioni" ADD CONSTRAINT "promozioni_prodotto_id_prodotti_id_fk" FOREIGN KEY ("prodotto_id") REFERENCES "app"."prodotti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parametri_versioni_dal" ON "app"."parametri_versioni" USING btree ("valido_dal");--> statement-breakpoint
CREATE INDEX "prodotti_ordine" ON "app"."prodotti" USING btree ("attivo","ordine");--> statement-breakpoint
CREATE INDEX "promozioni_periodo" ON "app"."promozioni" USING btree ("dal","al");