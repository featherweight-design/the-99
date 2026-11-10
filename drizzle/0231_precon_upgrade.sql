-- Upgrade this precon, PR 2: the `precon_upgrades` run table, the `precon_upgrade` ledger feature in model_calls_feature_check,
-- and the model switch PRECON_UPGRADE_ENABLED in flag_overrides_switch_check (so an override row for it can be written).
-- `precon_file` has no foreign key: the precons publish deletes and re-inserts every precon, and a cascade would wipe the results.
-- REVERSAL, in this order: DROP TABLE "precon_upgrades"; DELETE FROM "model_calls" WHERE "feature" = 'precon_upgrade';
-- DELETE FROM "flag_overrides" WHERE "switch" = 'PRECON_UPGRADE_ENABLED'; then drop and re-add flag_overrides_switch_check with 0229's
-- list and model_calls_feature_check with 0183's list (the same statements without the new values).
CREATE TABLE "precon_upgrades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"precon_file" text NOT NULL,
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
	CONSTRAINT "precon_upgrades_status_check" CHECK ("precon_upgrades"."status" in ('pending', 'done', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "precon_upgrades" ADD CONSTRAINT "precon_upgrades_model_call_id_model_calls_id_fk" FOREIGN KEY ("model_call_id") REFERENCES "public"."model_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "precon_upgrades_one_pending_idx" ON "precon_upgrades" USING btree ("user_id","precon_file") WHERE "precon_upgrades"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "precon_upgrades_user_precon_idx" ON "precon_upgrades" USING btree ("user_id","precon_file","created_at");--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ANNOUNCEMENTS_ENABLED', 'FEEDBACK_ENABLED', 'FLYER_TRIAL_ENABLED', 'LIST_CACHE_ENABLED', 'MODEL_CALLS_ENABLED', 'NAV_STALL_LOG_ENABLED', 'OVERVIEW_V2_ENABLED', 'PAYMENTS_ENABLED', 'PRECON_UPGRADE_ENABLED', 'PUSH_ENABLED', 'PUBLIC_LANDING_ENABLED', 'PUBLIC_PAGES_ENABLED', 'RATE_LIMIT_ENABLED', 'SCAN_LAB_ENABLED', 'SUGGESTED_CHANGES_V2_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake', 'proposed_cuts', 'fits_read', 'labels', 'prose', 'precon_overview', 'suggested_changes_v2', 'precon_upgrade'));