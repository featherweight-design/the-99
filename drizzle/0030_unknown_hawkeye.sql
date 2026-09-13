ALTER TABLE "decks" ADD COLUMN "last_edited_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
-- Seeded from `created_at`, not left at the default. `now()` would stamp every
-- existing deck with the deploy instant, and Home's resume block orders on this
-- column: the whole list would sort by an event that never happened, in an order
-- nobody could explain, until each deck was next edited.
UPDATE "decks" SET "last_edited_at" = "created_at";
