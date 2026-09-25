ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "decks" DROP COLUMN "answer_intent_pending";--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake'));