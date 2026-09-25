ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
-- `decks.answer_intent_pending` leaves the schema here and stays in the database. This build stops
-- selecting it, but the build still serving selects it until this one is promoted, and migrations
-- run first: dropping it now fails that build's deck reads with 42703. A custom migration in a
-- later deploy drops it (`DROP COLUMN IF EXISTS`), once no serving build names it.
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake'));
