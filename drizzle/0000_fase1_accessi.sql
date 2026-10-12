CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."ruolo" AS ENUM('incaricato', 'amministrazione', 'contabilita');--> statement-breakpoint
CREATE TYPE "app"."scopo_codice" AS ENUM('accesso_staff', 'recupero_password');--> statement-breakpoint
CREATE TYPE "app"."stato_incaricato" AS ENUM('attivo', 'sospeso', 'cessato', 'cliente');--> statement-breakpoint
CREATE TYPE "app"."stato_richiesta" AS ENUM('nuova', 'gestita');--> statement-breakpoint
CREATE SEQUENCE "app"."sequenza_codice_incaricato" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "app"."codici_verifica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utente_id" uuid NOT NULL,
	"scopo" "app"."scopo_codice" NOT NULL,
	"impronta" text NOT NULL,
	"tentativi" integer DEFAULT 0 NOT NULL,
	"scade_il" timestamp with time zone NOT NULL,
	"usato_il" timestamp with time zone,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."email_in_uscita" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destinatario" text NOT NULL,
	"oggetto" text NOT NULL,
	"inviata_il" timestamp with time zone,
	"errore" text,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."incaricati" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utente_id" uuid NOT NULL,
	"codice" text NOT NULL,
	"nome" text NOT NULL,
	"cognome" text NOT NULL,
	"codice_fiscale" text NOT NULL,
	"data_nascita" date NOT NULL,
	"indirizzo" text NOT NULL,
	"cap" text NOT NULL,
	"citta" text NOT NULL,
	"provincia" text NOT NULL,
	"telefono" text NOT NULL,
	"iban" text NOT NULL,
	"partita_iva" text,
	"sponsor_id" uuid,
	"stato" "app"."stato_incaricato" DEFAULT 'attivo' NOT NULL,
	"start_kit_pagato" boolean DEFAULT false NOT NULL,
	"privacy_accettata_il" timestamp with time zone NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incaricati_utente_id_unique" UNIQUE("utente_id"),
	CONSTRAINT "incaricati_codice_unique" UNIQUE("codice"),
	CONSTRAINT "incaricati_codice_fiscale_unique" UNIQUE("codice_fiscale")
);
--> statement-breakpoint
CREATE TABLE "app"."registro_modifiche" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"utente_id" uuid,
	"azione" text NOT NULL,
	"entita" text NOT NULL,
	"entita_id" text,
	"prima" jsonb,
	"dopo" jsonb,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."richieste_contatto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cognome" text NOT NULL,
	"telefono" text NOT NULL,
	"email" text NOT NULL,
	"citta" text NOT NULL,
	"stato" "app"."stato_richiesta" DEFAULT 'nuova' NOT NULL,
	"note" text,
	"gestita_da" uuid,
	"gestita_il" timestamp with time zone,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."sessioni" (
	"impronta" text PRIMARY KEY NOT NULL,
	"utente_id" uuid NOT NULL,
	"verificata" boolean NOT NULL,
	"scade_il" timestamp with time zone NOT NULL,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."storico_sponsor" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incaricato_id" uuid NOT NULL,
	"sponsor_id" uuid,
	"dal" timestamp with time zone DEFAULT now() NOT NULL,
	"motivo" text NOT NULL,
	"modificato_da" uuid
);
--> statement-breakpoint
CREATE TABLE "app"."utenti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruolo" "app"."ruolo" NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"password_hash" text,
	"attivo" boolean DEFAULT true NOT NULL,
	"tentativi_falliti" integer DEFAULT 0 NOT NULL,
	"bloccato_fino" timestamp with time zone,
	"ultimo_accesso" timestamp with time zone,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."codici_verifica" ADD CONSTRAINT "codici_verifica_utente_id_utenti_id_fk" FOREIGN KEY ("utente_id") REFERENCES "app"."utenti"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD CONSTRAINT "incaricati_utente_id_utenti_id_fk" FOREIGN KEY ("utente_id") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."incaricati" ADD CONSTRAINT "incaricati_sponsor_id_incaricati_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."registro_modifiche" ADD CONSTRAINT "registro_modifiche_utente_id_utenti_id_fk" FOREIGN KEY ("utente_id") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."richieste_contatto" ADD CONSTRAINT "richieste_contatto_gestita_da_utenti_id_fk" FOREIGN KEY ("gestita_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sessioni" ADD CONSTRAINT "sessioni_utente_id_utenti_id_fk" FOREIGN KEY ("utente_id") REFERENCES "app"."utenti"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_sponsor" ADD CONSTRAINT "storico_sponsor_incaricato_id_incaricati_id_fk" FOREIGN KEY ("incaricato_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_sponsor" ADD CONSTRAINT "storico_sponsor_sponsor_id_incaricati_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "app"."incaricati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."storico_sponsor" ADD CONSTRAINT "storico_sponsor_modificato_da_utenti_id_fk" FOREIGN KEY ("modificato_da") REFERENCES "app"."utenti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codici_verifica_utente" ON "app"."codici_verifica" USING btree ("utente_id","scopo");--> statement-breakpoint
CREATE INDEX "incaricati_sponsor" ON "app"."incaricati" USING btree ("sponsor_id");--> statement-breakpoint
CREATE INDEX "incaricati_cognome" ON "app"."incaricati" USING btree ("cognome");--> statement-breakpoint
CREATE INDEX "registro_modifiche_entita" ON "app"."registro_modifiche" USING btree ("entita","entita_id");--> statement-breakpoint
CREATE INDEX "registro_modifiche_data" ON "app"."registro_modifiche" USING btree ("creato_il");--> statement-breakpoint
CREATE INDEX "sessioni_utente" ON "app"."sessioni" USING btree ("utente_id");--> statement-breakpoint
CREATE INDEX "storico_sponsor_incaricato" ON "app"."storico_sponsor" USING btree ("incaricato_id");--> statement-breakpoint
CREATE UNIQUE INDEX "utenti_email_staff" ON "app"."utenti" USING btree (lower("email")) WHERE "app"."utenti"."ruolo" <> 'incaricato';--> statement-breakpoint
CREATE UNIQUE INDEX "utenti_email_incaricati" ON "app"."utenti" USING btree (lower("email")) WHERE "app"."utenti"."ruolo" = 'incaricato';