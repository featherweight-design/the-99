CREATE TABLE "deck_unresolved_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"raw_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"source_line" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deck_unresolved_rows" ADD CONSTRAINT "deck_unresolved_rows_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_unresolved_rows_deck_idx" ON "deck_unresolved_rows" USING btree ("deck_id");