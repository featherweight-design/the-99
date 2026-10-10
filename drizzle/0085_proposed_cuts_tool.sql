-- Purely additive and permissive; no row is rewritten. Every existing run takes the default
-- 'suggested_changes'. The new unique index is built BEFORE the old one is dropped, so the build
-- still serving (which inserts runs without a tool) is never left without its one-pending-per-deck
-- guard. Down: drop the check and the tool index, recreate the old index on (deck_id), drop the
-- column, and restore the feature check without 'proposed_cuts' once no such row exists.
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD COLUMN "tool" text DEFAULT 'suggested_changes' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "deck_suggestion_runs_one_pending_tool_idx" ON "deck_suggestion_runs" USING btree ("deck_id","tool") WHERE "deck_suggestion_runs"."status" = 'pending';--> statement-breakpoint
DROP INDEX "deck_suggestion_runs_one_pending_idx";--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD CONSTRAINT "deck_suggestion_runs_tool_check" CHECK ("deck_suggestion_runs"."tool" in ('suggested_changes', 'proposed_cuts'));--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake', 'proposed_cuts', 'labels', 'prose'));
