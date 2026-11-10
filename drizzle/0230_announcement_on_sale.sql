-- Drop alerts PR 1: when a Secret Lair post says its sale starts. All nullable; the ingest fills them from the post's words,
-- and a post that names no sale leaves them null. on_sale_at is the start as a UTC instant and on_sale_zone the zone the post
-- wrote its clock time in; pre_queue_at is when the pre-queue opens.
-- REVERSAL: ALTER TABLE "wizards_announcements" DROP COLUMN "on_sale_date", DROP COLUMN "on_sale_at", DROP COLUMN "on_sale_zone", DROP COLUMN "pre_queue_at";
ALTER TABLE "wizards_announcements" ADD COLUMN "on_sale_date" date;--> statement-breakpoint
ALTER TABLE "wizards_announcements" ADD COLUMN "on_sale_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wizards_announcements" ADD COLUMN "on_sale_zone" text;--> statement-breakpoint
ALTER TABLE "wizards_announcements" ADD COLUMN "pre_queue_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wizards_announcements" ADD CONSTRAINT "wizards_announcements_on_sale_check" CHECK (("wizards_announcements"."on_sale_at" is null) = ("wizards_announcements"."on_sale_zone" is null) and ("wizards_announcements"."on_sale_at" is null or "wizards_announcements"."on_sale_date" is not null) and ("wizards_announcements"."pre_queue_at" is null or "wizards_announcements"."on_sale_at" is not null));