ALTER TABLE "spare_requests" DROP CONSTRAINT "spare_requests_status_check";--> statement-breakpoint
ALTER TABLE "spare_requests" ADD COLUMN "copies" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "spare_requests" ADD COLUMN "deck_id" uuid;--> statement-breakpoint
ALTER TABLE "spare_requests" ADD COLUMN "asker_cleared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "feed_kinds_declined" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "spare_requests" ADD CONSTRAINT "spare_requests_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spare_requests" ADD CONSTRAINT "spare_requests_copies_check" CHECK ("spare_requests"."copies" between 1 and 99);--> statement-breakpoint
ALTER TABLE "spare_requests" ADD CONSTRAINT "spare_requests_status_check" CHECK ("spare_requests"."status" in ('open', 'yes', 'no', 'expired', 'withdrawn'));