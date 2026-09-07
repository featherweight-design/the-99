-- The list's ordering key, separated from the figure the page prints.
--
-- #385 made `score` honest: a commander EDHREC does not index is scored out of 40 and
-- no longer rescaled back up to 100. It did not carry the ordering across, so every
-- unindexed commander then sorted below anything that reached 41 on a scale two and a
-- half times as long — demoted for a gap in our data rather than a gap in its fit.
-- `rank_score` is that same score back on the 0-100 scale, used only as an ORDER BY
-- key. It is never printed and never drawn.
--
-- The DELETE is still needed, because the segment arithmetic changed in the same commit —
-- `fit_pool`/`fit_roles`/`fit_synergy` are now whole points rather than tenths, so persisted
-- rows carry figures whose legend would not add up to the headline beside it, and nothing
-- marks that staleness.
--
-- It comes last, and the column keeps a default, so the schema change does not depend on the
-- table being empty. Ordered the other way round, an insert from the still-live old deployment
-- landing between the DELETE and the ALTER would fail the whole production build: this runs
-- inside the Vercel build, `getRankedList` re-persists on a miss, and nothing here holds a lock
-- that blocks writes for that window. The default stays rather than being dropped here for the
-- same reason: the old deployment keeps inserting without `rank_score` until its replacement is
-- live, and a NOT NULL column with no default would reject every one of those writes. It is
-- never read by the new code, which writes the column on every insert.
--
-- Safe to empty, on the same grounds as 0016: `commander_scores` is derived data.
-- `getRankedList` recomputes and re-persists on a miss, and `replaceCollection` already
-- deletes the whole table unconditionally on every confirmed import. The recompute
-- reads `edhrec_cache`, untouched here, so it makes no upstream EDHREC calls.
--
-- DELETE rather than TRUNCATE, deliberately: TRUNCATE takes an ACCESS EXCLUSIVE lock,
-- and this runs inside the production Vercel build while the deployed app is still
-- serving reads off this table.
DROP INDEX "commander_scores_rank_idx";--> statement-breakpoint
ALTER TABLE "commander_scores" ADD COLUMN "rank_score" real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "commander_scores_rank_idx" ON "commander_scores" USING btree ("user_id","rank_score" DESC NULLS LAST,"oracle_id");--> statement-breakpoint
DELETE FROM "commander_scores";
