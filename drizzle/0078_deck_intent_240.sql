ALTER TABLE "decks" DROP CONSTRAINT "decks_intent_length_check";--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_intent_length_check" CHECK ("decks"."intent" is null or char_length("decks"."intent") <= 240);--> statement-breakpoint
-- H35 ruling 3: a fill no longer seeds a line, and the auto-written sentence is cleared rather
-- than kept as if the player had typed it. `intent_seeded` itself is left in place; its future
-- is engineering's call.
UPDATE "decks" SET "intent" = NULL WHERE "intent_seeded" = true;