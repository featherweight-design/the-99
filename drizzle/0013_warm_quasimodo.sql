ALTER TABLE "deck_cards" ADD COLUMN "auto" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "filled" boolean DEFAULT false NOT NULL;