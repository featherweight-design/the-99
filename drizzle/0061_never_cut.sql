CREATE TABLE "deck_locks" (
	"deck_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp,
	CONSTRAINT "deck_locks_deck_id_oracle_id_pk" PRIMARY KEY("deck_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "deck_locks" ADD CONSTRAINT "deck_locks_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_locks" ADD CONSTRAINT "deck_locks_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_locks_oracle_idx" ON "deck_locks" USING btree ("oracle_id","deck_id");--> statement-breakpoint
-- A card that comes back by any path but Undo, Put back or a discard arrives UNLOCKED (F2), and
-- this is the one place every add passes through: the add panel, the fill, a tuning apply, a
-- Take, a pull, an import. It deletes a DORMANT lock row for the inserted card, and never a live
-- one: a discard deletes and reinserts every row, and a card that never left keeps its lock (F1).
-- The discard revives the row BEFORE its insert, so this finds nothing; the row's Undo, the card
-- view's Undo and the review screen's Put back will do the same when they are wired (Locked PR 5).
-- An upsert onto a row that still exists fires no insert trigger, which is safe: a card still in
-- the deck never has a dormant row.
CREATE OR REPLACE FUNCTION deck_locks_forget_dormant() RETURNS trigger AS $$
BEGIN
  DELETE FROM deck_locks
  WHERE deck_id = NEW.deck_id AND oracle_id = NEW.oracle_id AND removed_at IS NOT NULL;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS deck_cards_forget_dormant_lock ON "deck_cards";
--> statement-breakpoint
CREATE TRIGGER deck_cards_forget_dormant_lock
  AFTER INSERT ON "deck_cards"
  FOR EACH ROW EXECUTE FUNCTION deck_locks_forget_dormant();
