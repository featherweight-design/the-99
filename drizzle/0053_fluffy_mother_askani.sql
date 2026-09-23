CREATE TABLE "deck_suggestion_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"add_oracle_id" uuid NOT NULL,
	"cut_oracle_id" uuid,
	"rationale" text NOT NULL,
	"rationale_short" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"position" integer NOT NULL,
	"verdict" text DEFAULT 'pending' NOT NULL,
	"verdict_at" timestamp,
	"bracket_after" integer[],
	"undo_snapshot" jsonb,
	CONSTRAINT "deck_suggestion_items_verdict_check" CHECK ("deck_suggestion_items"."verdict" in ('pending', 'accepted', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "deck_suggestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"input_fingerprint" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"profile_version" integer NOT NULL,
	"model_call_id" uuid NOT NULL,
	"status" text NOT NULL,
	"error_class" text,
	"dropped_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "deck_suggestion_runs_status_check" CHECK ("deck_suggestion_runs"."status" in ('pending', 'ok', 'failed', 'cancelled')),
	CONSTRAINT "deck_suggestion_runs_error_class_check" CHECK ("deck_suggestion_runs"."error_class" is null or "deck_suggestion_runs"."error_class" in ('upstream_busy', 'timeout', 'malformed', 'ungrounded', 'interrupted'))
);
--> statement-breakpoint
CREATE TABLE "model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feature" text NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis')),
	CONSTRAINT "model_calls_status_check" CHECK ("model_calls"."status" in ('reserved', 'spent', 'refunded'))
);
--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "intent" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "intent_seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_suggestion_items" ADD CONSTRAINT "deck_suggestion_items_run_id_deck_suggestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."deck_suggestion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_suggestion_items" ADD CONSTRAINT "deck_suggestion_items_add_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("add_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_suggestion_items" ADD CONSTRAINT "deck_suggestion_items_cut_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("cut_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD CONSTRAINT "deck_suggestion_runs_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD CONSTRAINT "deck_suggestion_runs_model_call_id_model_calls_id_fk" FOREIGN KEY ("model_call_id") REFERENCES "public"."model_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_suggestion_items_run_position_idx" ON "deck_suggestion_items" USING btree ("run_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "deck_suggestion_runs_one_pending_idx" ON "deck_suggestion_runs" USING btree ("deck_id") WHERE "deck_suggestion_runs"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "deck_suggestion_runs_deck_created_idx" ON "deck_suggestion_runs" USING btree ("deck_id","created_at");--> statement-breakpoint
CREATE INDEX "deck_suggestion_runs_user_created_idx" ON "deck_suggestion_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "model_calls_user_created_idx" ON "model_calls" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_intent_length_check" CHECK ("decks"."intent" is null or char_length("decks"."intent") <= 120);