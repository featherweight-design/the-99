CREATE TABLE "precon_synopses" (
	"precon_file" text NOT NULL,
	"contract_version" integer NOT NULL,
	"list_fingerprint" text NOT NULL,
	"input_hash" text NOT NULL,
	"model" text NOT NULL,
	"content" jsonb NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_micro_usd" bigint,
	"current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "precon_synopses_precon_file_contract_version_pk" PRIMARY KEY("precon_file","contract_version")
);
--> statement-breakpoint
ALTER TABLE "model_calls" DROP CONSTRAINT "model_calls_feature_check";--> statement-breakpoint
ALTER TABLE "deck_synopses" ALTER COLUMN "model_call_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_synopses" ADD COLUMN "precon_file" text;--> statement-breakpoint
ALTER TABLE "deck_synopses" ADD CONSTRAINT "deck_synopses_call_or_precon_check" CHECK (("deck_synopses"."model_call_id" is null) = ("deck_synopses"."precon_file" is not null));--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_feature_check" CHECK ("model_calls"."feature" in ('tuning', 'synopsis', 'intake', 'proposed_cuts', 'fits_read', 'labels', 'prose', 'precon_overview'));