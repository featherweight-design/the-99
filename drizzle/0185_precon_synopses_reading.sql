ALTER TABLE "precon_synopses" ADD COLUMN "reading" jsonb;--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_permits" integer[];--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_list" text;--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_catalog" text;--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_profile_version" integer;--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_rules_version" integer;--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_analyzed_oracle_ids" uuid[];--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_seen_seq" bigint;--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD COLUMN "reading_at" timestamp;