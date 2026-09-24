CREATE TABLE "deck_data_changes" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"direction" text NOT NULL,
	"oracle_ids" uuid[] NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_data_changes_kind_check" CHECK ("deck_data_changes"."kind" in ('gameChanger', 'massLandDenial', 'extraTurns', 'combo', 'rules', 'notLegal')),
	CONSTRAINT "deck_data_changes_direction_check" CHECK ("deck_data_changes"."direction" in ('added', 'removed', 'moved'))
);
--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD COLUMN "seen_seq" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD COLUMN "notices_read_seq" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD COLUMN "rules_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD COLUMN "analyzed_oracle_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_synopses" ADD COLUMN "seen_seq" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "notices_legal_seen" uuid[];--> statement-breakpoint
CREATE INDEX "deck_data_changes_oracle_ids_idx" ON "deck_data_changes" USING gin ("oracle_ids");--> statement-breakpoint
CREATE UNIQUE INDEX "deck_data_changes_rules_version_idx" ON "deck_data_changes" USING btree (("detail"->>'rulesVersion')) WHERE "deck_data_changes"."kind" = 'rules';--> statement-breakpoint
-- Backfills (deck notices plan D3). Both are idempotent: each only writes rows still at the
-- column's default, so a re-run changes nothing. Both are bounded by `deck_profiles`, one row per
-- analyzed deck.
--
-- Every reading on record was computed under the bracket rules as they stand at this migration,
-- which is BRACKET_RULES_VERSION 1 (src/lib/bracket/rules-version.ts). Version 1 writes no rules
-- entry, so no existing reading is told a rule moved.
UPDATE "deck_profiles" SET "rules_version" = 1 WHERE "rules_version" = 0;--> statement-breakpoint
-- The analyzed list, commanders included. The reading's own list is not recoverable from the
-- row, so the deck's current cards stand in: on a clean row they ARE the analyzed list, and a
-- dirty row is replaced by its next analysis, which writes the real one. `seen_seq` and
-- `notices_read_seq` need no backfill: the log is empty here, and 0 is its head.
UPDATE "deck_profiles" AS p SET "analyzed_oracle_ids" = sub.ids
FROM (
  SELECT d.id AS deck_id,
    array(
      SELECT DISTINCT x FROM unnest(
        array_remove(array[d.commander_oracle_id, d.partner_oracle_id], NULL)
        || coalesce((SELECT array_agg(dc.oracle_id) FROM "deck_cards" dc WHERE dc.deck_id = d.id), '{}'::uuid[])
      ) AS x ORDER BY x
    ) AS ids
  FROM "decks" d JOIN "deck_profiles" pp ON pp.deck_id = d.id AND cardinality(pp."analyzed_oracle_ids") = 0
) AS sub
WHERE sub.deck_id = p.deck_id AND cardinality(p."analyzed_oracle_ids") = 0;
