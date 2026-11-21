-- Guided build, PR A1: the `guided_builds` run table (one sharpening run on one deck) and the `guided_build` ledger feature in model_calls_feature_check.
-- Additive: a new table, no backfill, no new switch (it rides PRECON_UPGRADE_ENABLED). A deck's delete cascades its runs.
-- REVERSAL, in this order: DROP TABLE "guided_builds"; DELETE FROM "model_calls" WHERE "feature" = 'guided_build'; then drop and re-add
-- model_calls_feature_check with 0231's list (the same statement without 'guided_build').
CREATE TABLE "guided_builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"deck_id" uuid NOT NULL,
	"strategy_key" text NOT NULL,
	"strategy_label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" text NOT NULL,
	"error_class" text,
	"refunded" boolean DEFAULT false NOT NULL,
	"model_call_id" uuid NOT NULL,
	"model" text NOT NULL,
	"pairs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"drops" jsonb,
	"buy_total_cents" integer,
	"bracket_before" smallint,
	"bracket_after" smallint,
	"calls" smallint,
	"bracket_target" smallint NOT NULL,
	"pool_mode" text NOT NULL,
	"pool_cap_cents" integer,
	"budget_cents" integer,
	"kept" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overview_at" timestamp,
	CONSTRAINT "guided_builds_status_check" CHECK ("guided_builds"."status" in ('pending', 'done', 'failed')),
	CONSTRAINT "guided_builds_pool_mode_check" CHECK ("guided_builds"."pool_mode" in ('owned', 'cap', 'budget'))
);
--> statement-breakpoint
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "guided_builds" ADD CONSTRAINT "guided_builds_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_builds" ADD CONSTRAINT "guided_builds_model_call_id_model_calls_id_fk" FOREIGN KEY ("model_call_id") REFERENCES "public"."model_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guided_builds_one_pending_idx" ON "guided_builds" USING btree ("deck_id") WHERE "guided_builds"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "guided_builds_deck_idx" ON "guided_builds" USING btree ("deck_id","created_at");--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake', 'proposed_cuts', 'fits_read', 'labels', 'prose', 'precon_overview', 'suggested_changes_v2', 'precon_upgrade', 'guided_build'));