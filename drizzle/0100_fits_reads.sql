CREATE TABLE "fits_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" text NOT NULL,
	"outcome" text,
	"error_class" text,
	"refunded" boolean DEFAULT false NOT NULL,
	"model_call_id" uuid NOT NULL,
	"model" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"candidate_hashes" jsonb NOT NULL,
	"picks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"returned" integer,
	"drops" jsonb,
	CONSTRAINT "fits_reads_status_check" CHECK ("fits_reads"."status" in ('pending', 'done', 'failed')),
	CONSTRAINT "fits_reads_outcome_check" CHECK ("fits_reads"."outcome" is null or "fits_reads"."outcome" in ('picks', 'noFit'))
);
--> statement-breakpoint
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "fits_reads" ADD CONSTRAINT "fits_reads_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fits_reads" ADD CONSTRAINT "fits_reads_model_call_id_model_calls_id_fk" FOREIGN KEY ("model_call_id") REFERENCES "public"."model_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fits_reads_one_pending_idx" ON "fits_reads" USING btree ("user_id","oracle_id") WHERE "fits_reads"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "fits_reads_user_card_idx" ON "fits_reads" USING btree ("user_id","oracle_id","created_at");--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake', 'proposed_cuts', 'fits_read', 'labels', 'prose'));