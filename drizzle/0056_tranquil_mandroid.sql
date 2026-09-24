CREATE TABLE "deck_synopses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"fingerprint" text NOT NULL,
	"contract_version" integer NOT NULL,
	"model" text NOT NULL,
	"model_call_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"outcome" text,
	"content" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"retry_of" uuid,
	CONSTRAINT "deck_synopses_status_check" CHECK ("deck_synopses"."status" in ('pending', 'done')),
	CONSTRAINT "deck_synopses_outcome_check" CHECK (("deck_synopses"."status" = 'pending') = ("deck_synopses"."outcome" is null)
        and ("deck_synopses"."outcome" is null or "deck_synopses"."outcome" in ('survived', 'refused', 'malformed', 'upstream_busy', 'timeout', 'interrupted')))
);
--> statement-breakpoint
CREATE TABLE "deck_version_synopses" (
	"version_id" uuid PRIMARY KEY NOT NULL,
	"synopsis_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deck_synopses" ADD CONSTRAINT "deck_synopses_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_synopses" ADD CONSTRAINT "deck_synopses_model_call_id_model_calls_id_fk" FOREIGN KEY ("model_call_id") REFERENCES "public"."model_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_version_synopses" ADD CONSTRAINT "deck_version_synopses_version_id_deck_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."deck_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_version_synopses" ADD CONSTRAINT "deck_version_synopses_synopsis_id_deck_synopses_id_fk" FOREIGN KEY ("synopsis_id") REFERENCES "public"."deck_synopses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deck_synopses_one_pending_idx" ON "deck_synopses" USING btree ("deck_id") WHERE "deck_synopses"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "deck_synopses_deck_created_idx" ON "deck_synopses" USING btree ("deck_id","created_at");