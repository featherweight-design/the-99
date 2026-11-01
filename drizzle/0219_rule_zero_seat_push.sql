ALTER TABLE "push_outbox" DROP CONSTRAINT "push_outbox_kind_check";--> statement-breakpoint
ALTER TABLE "rule_zero_seats" ADD COLUMN "notice_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_outbox" ADD CONSTRAINT "push_outbox_kind_check" CHECK ("push_outbox"."kind" in ('new-set', 'new-precon', 'price-drop', 'trade-match', 'spare-request', 'combo', 'secret-lair', 'commander-decklists', 'wizards-news', 'rule_zero_seat'));--> statement-breakpoint
-- Seats already at an open table were set before the notice existed: they are not news.
UPDATE "rule_zero_seats" SET "notice_seen_at" = now() WHERE "notice_seen_at" IS NULL;
