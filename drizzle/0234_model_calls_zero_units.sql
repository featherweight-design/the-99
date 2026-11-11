-- Upgrade this precon, PR 6b (the Overview at Start). A deck started from a run gets its Overview inside the run's 2 credits: a
-- player-origin synopsis call (its dollars count toward the owner's month) that costs 0 credits, so model_calls.units may now be 0.
-- precon_upgrades.overview_at is the one-per-run claim, set by the first Start from the run.
-- Reversal (only once no row holds units = 0: DELETE or UPDATE them first): ALTER TABLE "precon_upgrades" DROP COLUMN "overview_at"; ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_units_check"; ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_units_check" CHECK ("model_calls"."units" between 1 and 2);
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_units_check";--> statement-breakpoint
ALTER TABLE "precon_upgrades" ADD COLUMN "overview_at" timestamp;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_units_check" CHECK ("model_calls"."units" between 0 and 2);