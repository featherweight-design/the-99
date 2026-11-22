ALTER TABLE "judged_labels" ADD COLUMN "verified_themes" jsonb;--> statement-breakpoint
ALTER TABLE "judged_labels" ADD COLUMN "verified_at" timestamp with time zone;