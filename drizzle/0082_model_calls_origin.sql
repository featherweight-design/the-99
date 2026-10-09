-- The default stays: migrations run before promotion, and the build still serving inserts model_calls
-- rows without an origin. Dropping it now would fail every player press until this build is promoted.
-- Every writer in this build states its origin; a later migration drops the default.
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "origin" text DEFAULT 'player' NOT NULL;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_origin_check" CHECK ("model_calls"."origin" in ('player', 'system'));--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake', 'labels', 'prose'));