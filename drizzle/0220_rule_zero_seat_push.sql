ALTER TABLE "push_outbox" DROP CONSTRAINT "push_outbox_kind_check";--> statement-breakpoint
ALTER TABLE "rule_zero_seats" ADD COLUMN "notice_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_outbox" ADD CONSTRAINT "push_outbox_kind_check" CHECK ("push_outbox"."kind" in ('new-set', 'new-precon', 'price-drop', 'trade-match', 'spare-request', 'combo', 'secret-lair', 'commander-decklists', 'wizards-news', 'rule_zero_seat'));--> statement-breakpoint
-- Every seat that exists now (open table or not) was set before the notice existed: none of them is news. A seat inserted by the
-- previous code between this migration (run at build) and the new deploy keeps a null and will read as unseen.
UPDATE "rule_zero_seats" SET "notice_seen_at" = now() WHERE "notice_seen_at" IS NULL;
