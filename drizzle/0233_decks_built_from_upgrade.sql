-- Upgrade this precon, PR 6 (Start with the swaps). decks.built_from_upgrade_id names the run a deck was started from (v0 the box,
-- v1 its swaps); null for every deck that exists. The FK is ON DELETE SET NULL, so purging a reader's runs never touches a deck.
-- Reversal: ALTER TABLE "decks" DROP CONSTRAINT "decks_built_from_upgrade_id_precon_upgrades_id_fk"; ALTER TABLE "decks" DROP COLUMN "built_from_upgrade_id";
ALTER TABLE "decks" ADD COLUMN "built_from_upgrade_id" uuid;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_built_from_upgrade_id_precon_upgrades_id_fk" FOREIGN KEY ("built_from_upgrade_id") REFERENCES "public"."precon_upgrades"("id") ON DELETE set null ON UPDATE no action;
