-- Public landing PR 4a: the plumbing switch PUBLIC_LANDING_ENABLED joins the CHECK, so an override row for it can be written.
-- REVERSAL: DELETE FROM "flag_overrides" WHERE "switch" = 'PUBLIC_LANDING_ENABLED'; then drop and re-add the constraint
-- with 0227's list (the same statement without 'PUBLIC_LANDING_ENABLED').
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ANNOUNCEMENTS_ENABLED', 'FEEDBACK_ENABLED', 'FLYER_TRIAL_ENABLED', 'LIST_CACHE_ENABLED', 'MODEL_CALLS_ENABLED', 'NAV_STALL_LOG_ENABLED', 'OVERVIEW_V2_ENABLED', 'PAYMENTS_ENABLED', 'PUSH_ENABLED', 'PUBLIC_LANDING_ENABLED', 'PUBLIC_PAGES_ENABLED', 'RATE_LIMIT_ENABLED', 'SCAN_LAB_ENABLED', 'SUGGESTED_CHANGES_V2_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));
