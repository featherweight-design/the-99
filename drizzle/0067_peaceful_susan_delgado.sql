CREATE TABLE "card_labels" (
	"oracle_id" uuid PRIMARY KEY NOT NULL,
	"labels" jsonb NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"labelled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_labels" ADD CONSTRAINT "card_labels_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE cascade ON UPDATE no action;