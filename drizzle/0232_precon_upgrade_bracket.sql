-- Upgrade this precon, PR 5 (bracket as an input). Two nullable columns on precon_upgrades, no backfill: the table holds no
-- rows in production (the switch is off), and an older row reads as "no bracket chosen".
-- Reversal: ALTER TABLE "precon_upgrades" DROP COLUMN "list_fp", DROP COLUMN "bracket_target"; (nothing else reads them).
ALTER TABLE "precon_upgrades" ADD COLUMN "bracket_target" smallint;--> statement-breakpoint
ALTER TABLE "precon_upgrades" ADD COLUMN "list_fp" text;
