CREATE TYPE "app"."stato_ordine" AS ENUM('inserito', 'pagato', 'in_preparazione', 'spedito', 'consegnato', 'annullato', 'reso');--> statement-breakpoint
CREATE TYPE "app"."tipo_ordine" AS ENUM('start_kit', 'personale', 'online');--> statement-breakpoint
CREATE TYPE "app"."tipo_prezzo_riga" AS ENUM('listino_scontato', 'promozione', 'start_kit', 'listino_pieno');--> statement-breakpoint
ALTER TYPE "app"."ruolo" ADD VALUE 'ordini';--> statement-breakpoint
CREATE SEQUENCE "app"."sequenza_numero_ordine" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "app"."eventi_stripe" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"ricevuto_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."ordini" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" bigint DEFAULT nextval('app.sequenza_numero_ordine') NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"tipo" "app"."tipo_ordine" NOT NULL,
	"stato" "app"."stato_ordine" DEFAULT 'inserito' NOT NULL,
	"parametri_versione_id" bigint NOT NULL,
	"merce_iva_inclusa" bigint NOT NULL,
	"merce_iva_esclusa" bigint NOT NULL,
	"punti" bigint NOT NULL,
	"provvigione_acquisto" bigint NOT NULL,
	"spese_spedizione" bigint NOT NULL,
	"totale" bigint NOT NULL,
	"destinatario" text NOT NULL,
	"indirizzo" text NOT NULL,
	"cap" text NOT NULL,
	"citta" text NOT NULL,
	"provincia" text NOT NULL,
	"telefono" text NOT NULL,
	"riordino_confermato_il" timestamp with time zone,
	"stripe_sessione_id" text,
	"stripe_pagamento_id" text,
	"pagato_il" timestamp with time zone,
	"corriere" text,
	"tracciamento" text,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordini_numero_unique" UNIQUE("numero"),
	CONSTRAINT "ordini_stripe_sessione_id_unique" UNIQUE("stripe_sessione_id")
);
--> statement-breakpoint
CREATE TABLE "app"."righe_ordine" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ordine_id" uuid NOT NULL,
	"prodotto_id" uuid NOT NULL,
	"codice" text NOT NULL,
	"nome" text NOT NULL,
	"tipo_prezzo" "app"."tipo_prezzo_riga" NOT NULL,
	"promozione_id" uuid,
	"quantita" integer NOT NULL,
	"prezzo_unitario_ivato" bigint NOT NULL,
	"prezzo_unitario_iva_esclusa" bigint NOT NULL,
	"punti_unitari" bigint NOT NULL,
	"provvigione_unitaria" bigint NOT NULL,
	"totale_ivato" bigint NOT NULL,
	"totale_iva_esclusa" bigint NOT NULL,
	"totale_punti" bigint NOT NULL,
	"totale_provvigione" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."rimborsi" (
	"id" text PRIMARY KEY NOT NULL,
	"ordine_id" uuid NOT NULL,
	"importo" bigint NOT NULL,
	"rimborsato_il" timestamp with time zone NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."storico_stati_ordine" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ordine_id" uuid NOT NULL,
	"stato" "app"."stato_ordine" NOT NULL,
	"utente_id" uuid,
	"nota" text,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."ordini" ADD CONSTRAINT "ordini_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."ordini" ADD CONSTRAINT "ordini_parametri_versione_id_parametri_versioni_id_fk" FOREIGN KEY ("parametri_versione_id") REFERENCES "app"."parametri_versioni"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."righe_ordine" ADD CONSTRAINT "righe_ordine_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "app"."ordini"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."righe_ordine" ADD CONSTRAINT "righe_ordine_prodotto_id_prodotti_id_fk" FOREIGN KEY ("prodotto_id") REFERENCES "app"."prodotti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."righe_ordine" ADD CONSTRAINT "righe_ordine_promozione_id_promozioni_id_fk" FOREIGN KEY ("promozione_id") REFERENCES "app"."promozioni"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."rimborsi" ADD CONSTRAINT "rimborsi_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "app"."ordini"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_stati_ordine" ADD CONSTRAINT "storico_stati_ordine_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "app"."ordini"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_stati_ordine" ADD CONSTRAINT "storico_stati_ordine_utente_id_utenti_id_fk" FOREIGN KEY ("utente_id") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ordini_incaricato" ON "app"."ordini" USING btree ("incaricato_id","creato_il");--> statement-breakpoint
CREATE INDEX "ordini_stato" ON "app"."ordini" USING btree ("stato","creato_il");--> statement-breakpoint
CREATE INDEX "ordini_pagato_il" ON "app"."ordini" USING btree ("pagato_il");--> statement-breakpoint
CREATE INDEX "ordini_stripe_pagamento" ON "app"."ordini" USING btree ("stripe_pagamento_id");--> statement-breakpoint
CREATE INDEX "righe_ordine_ordine" ON "app"."righe_ordine" USING btree ("ordine_id");--> statement-breakpoint
CREATE INDEX "rimborsi_ordine" ON "app"."rimborsi" USING btree ("ordine_id");--> statement-breakpoint
CREATE INDEX "storico_stati_ordine_ordine" ON "app"."storico_stati_ordine" USING btree ("ordine_id");--> statement-breakpoint
-- Le incaricate già registrate prima dei pagamenti online non devono pagare lo start kit dall'app.
UPDATE "app"."incaricati" SET "start_kit_pagato" = true;
