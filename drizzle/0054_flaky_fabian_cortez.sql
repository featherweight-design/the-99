ALTER TABLE "deck_profiles" ADD COLUMN "profile_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD COLUMN "dirty" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD COLUMN "version_id" uuid;--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD CONSTRAINT "deck_profiles_version_id_deck_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."deck_versions"("id") ON DELETE set null ON UPDATE no action;