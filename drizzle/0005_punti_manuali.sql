ALTER TABLE "app"."prodotti" ADD COLUMN "punti_personale_manuali" bigint;--> statement-breakpoint
ALTER TABLE "app"."prodotti" ADD COLUMN "punti_online_manuali" bigint;--> statement-breakpoint
ALTER TABLE "app"."promozioni" ADD COLUMN "punti_manuali" bigint;--> statement-breakpoint
ALTER TABLE "app"."prodotti" ADD CONSTRAINT "prodotti_punti_manuali_validi"
  CHECK (("punti_personale_manuali" IS NULL OR "punti_personale_manuali" >= 0) AND ("punti_online_manuali" IS NULL OR "punti_online_manuali" >= 0));--> statement-breakpoint
ALTER TABLE "app"."promozioni" ADD CONSTRAINT "promozioni_punti_manuali_validi" CHECK ("punti_manuali" IS NULL OR "punti_manuali" >= 0);
