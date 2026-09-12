-- Two changes, one file, because they landed in one branch.
--
-- `writer_version` — which writer produced each `commander_scores` row. See
-- `SCORE_WRITER_CURRENT` in src/db/schema.ts. The DEFAULT is the point:
-- migrations run before the new build goes live, so the previous deployment
-- keeps inserting rows for a window afterwards and those inserts do not name
-- this column. They take the 1, and the new reader refuses them — which a one-off
-- `DELETE` could not do, since the old writer would repopulate the table behind
-- it. Version 1 means "written by a writer that dropped built commanders before
-- scoring": those sets have rows missing that `persistScores` deleted, and are
-- neither empty nor degraded, so the read would otherwise serve them as warm
-- forever. An old writer's UPDATEs are caught by the trigger in the next
-- migration, not by this default.
--
-- The two indexes are for `notBuiltBy`, a correlated `not exists` evaluated once
-- per candidate row — ~3,100 of them on the discover lane, and one per stored
-- score on the detail page's rank window.
ALTER TABLE "commander_scores" ADD COLUMN "writer_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "decks_user_commander_idx" ON "decks" USING btree ("user_id","commander_oracle_id");--> statement-breakpoint
CREATE INDEX "decks_user_partner_idx" ON "decks" USING btree ("user_id","partner_oracle_id");