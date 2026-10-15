ALTER TABLE "collection_items" ADD COLUMN "added_at" timestamp;--> statement-breakpoint
ALTER TABLE "collection_items" ADD COLUMN "added_exact" boolean DEFAULT false NOT NULL;