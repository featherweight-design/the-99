ALTER TABLE "decks" ADD COLUMN "tuning_cap_cents" integer;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "tuning_sets" text[];--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "tuning_owned_only" boolean;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_tuning_cap_check" CHECK ("decks"."tuning_cap_cents" is null or ("decks"."tuning_cap_cents" >= 100 and "decks"."tuning_cap_cents" % 100 = 0));