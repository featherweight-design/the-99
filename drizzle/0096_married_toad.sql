CREATE TABLE "deck_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"done_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "deck_notes_body_length_check" CHECK (char_length("deck_notes"."body") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "deck_notes" ADD CONSTRAINT "deck_notes_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_notes_deck_created_idx" ON "deck_notes" USING btree ("deck_id","created_at");