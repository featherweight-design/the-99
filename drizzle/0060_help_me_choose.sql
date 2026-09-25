CREATE TABLE "intake_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"words_hash" text NOT NULL,
	"model" text NOT NULL,
	"model_call_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_class" text,
	"chips" jsonb,
	CONSTRAINT "intake_reads_status_check" CHECK ("intake_reads"."status" in ('pending', 'ok', 'failed', 'cancelled')),
	CONSTRAINT "intake_reads_error_class_check" CHECK ("intake_reads"."error_class" is null or "intake_reads"."error_class" in ('upstream_busy', 'timeout', 'malformed', 'nothing_valid', 'interrupted'))
);
--> statement-breakpoint
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "answer_budget_cents" integer;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "answer_bracket" integer;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "answer_card_oracle_id" uuid;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "answer_intent_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "intake_reads" ADD CONSTRAINT "intake_reads_model_call_id_model_calls_id_fk" FOREIGN KEY ("model_call_id") REFERENCES "public"."model_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intake_reads_one_pending_idx" ON "intake_reads" USING btree ("user_id") WHERE "intake_reads"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "intake_reads_user_created_idx" ON "intake_reads" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_answer_card_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("answer_card_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_answer_budget_check" CHECK ("decks"."answer_budget_cents" is null or ("decks"."answer_budget_cents" >= 100 and "decks"."answer_budget_cents" % 100 = 0));--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_answer_bracket_range" CHECK ("decks"."answer_bracket" is null or "decks"."answer_bracket" between 1 and 5);--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake'));