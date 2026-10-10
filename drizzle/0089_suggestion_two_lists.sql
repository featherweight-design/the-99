-- Two lists (Suggested changes, sub-project 8): a line is an addition OR a cut, so the add column may be null.
-- Every existing row holds both and satisfies the check. Down: DELETE rows with a null add, then
-- DROP CONSTRAINT "deck_suggestion_items_one_card_check" and SET NOT NULL on "add_oracle_id".
ALTER TABLE "deck_suggestion_items" ALTER COLUMN "add_oracle_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_suggestion_items" ADD CONSTRAINT "deck_suggestion_items_one_card_check" CHECK ("deck_suggestion_items"."add_oracle_id" is not null or "deck_suggestion_items"."cut_oracle_id" is not null);