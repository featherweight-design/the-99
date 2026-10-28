ALTER TABLE "deck_suggestion_items" ADD COLUMN "picked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_suggestion_items" ADD COLUMN "apply_set" uuid;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD COLUMN "requested_count" smallint;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD COLUMN "request_text" text;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD COLUMN "bracket_choice" text;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD COLUMN "bracket_target" smallint;--> statement-breakpoint
CREATE INDEX "deck_suggestion_items_run_apply_set_idx" ON "deck_suggestion_items" USING btree ("run_id","apply_set") WHERE "deck_suggestion_items"."apply_set" is not null;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD CONSTRAINT "deck_suggestion_runs_requested_count_check" CHECK ("deck_suggestion_runs"."requested_count" is null or "deck_suggestion_runs"."requested_count" between 1 and 20);--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD CONSTRAINT "deck_suggestion_runs_request_text_check" CHECK ("deck_suggestion_runs"."request_text" is null or char_length("deck_suggestion_runs"."request_text") <= 500);--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD CONSTRAINT "deck_suggestion_runs_bracket_check" CHECK (("deck_suggestion_runs"."bracket_choice" is null and "deck_suggestion_runs"."bracket_target" is null) or ("deck_suggestion_runs"."bracket_choice" in ('keep', 'down', 'up') and "deck_suggestion_runs"."bracket_target" between 1 and 5));