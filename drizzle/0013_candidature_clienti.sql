ALTER TABLE "app"."richieste_contatto" ADD COLUMN "messaggio" text;--> statement-breakpoint
-- Candidature delle clienti da "Guadagna con G LUXE": sono richieste di contatto legate al cliente, come quelle "cliente".
ALTER TABLE "app"."richieste_contatto" DROP CONSTRAINT "richieste_contatto_tipo_valido";--> statement-breakpoint
ALTER TABLE "app"."richieste_contatto" ADD CONSTRAINT "richieste_contatto_tipo_valido"
  CHECK ("tipo" IN ('incaricata', 'cliente', 'candidatura') AND ("tipo" <> 'incaricata') = ("cliente_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "app"."richieste_contatto" ADD CONSTRAINT "richieste_contatto_messaggio_breve" CHECK ("messaggio" IS NULL OR length("messaggio") <= 1000);
