CREATE TABLE "card_label_batches" (
	"batch_id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"model" text NOT NULL,
	"asked" jsonb NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"collected_at" timestamp with time zone,
	CONSTRAINT "card_label_batches_status_check" CHECK ("card_label_batches"."status" in ('submitted', 'in_progress', 'collected', 'expired', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "card_labels_staging" (
	"run_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"labels" jsonb NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"labelled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_labels_staging_run_id_oracle_id_pk" PRIMARY KEY("run_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "card_labels_staging" ADD CONSTRAINT "card_labels_staging_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_label_batches_run_idx" ON "card_label_batches" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "card_labels_staging_run_idx" ON "card_labels_staging" USING btree ("run_id");