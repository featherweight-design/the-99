-- The list's ordering key, separated from the figure the page prints.
--
-- #385 made `score` honest: a commander EDHREC does not index is scored out of 40 and
-- no longer rescaled back up to 100. It did not carry the ordering across, so every
-- unindexed commander then sorted below anything that reached 41 on a scale two and a
-- half times as long — demoted for a gap in our data rather than a gap in its fit.
-- `rank_score` is that same score back on the 0-100 scale, used only as an ORDER BY
-- key. It is never printed and never drawn.
--
-- The DELETE comes first and is load-bearing twice over. `rank_score` is NOT NULL with
-- no default, so the ADD COLUMN cannot succeed while rows exist. And the segment
-- arithmetic changed in the same commit — `fit_pool`/`fit_roles`/`fit_synergy` are now
-- whole points rather than tenths, so persisted rows carry figures whose legend would
-- not add up to the headline beside it. Nothing marks either staleness.
--
-- Safe to empty, on the same grounds as 0016: `commander_scores` is derived data.
-- `getRankedList` recomputes and re-persists on a miss, and `replaceCollection` already
-- deletes the whole table unconditionally on every confirmed import. The recompute
-- reads `edhrec_cache`, untouched here, so it makes no upstream EDHREC calls.
--
-- DELETE rather than TRUNCATE, deliberately: TRUNCATE takes an ACCESS EXCLUSIVE lock,
-- and this runs inside the production Vercel build while the deployed app is still
-- serving reads off this table.
DELETE FROM "commander_scores";--> statement-breakpoint
DROP INDEX "commander_scores_rank_idx";--> statement-breakpoint
ALTER TABLE "commander_scores" ADD COLUMN "rank_score" real NOT NULL;--> statement-breakpoint
CREATE INDEX "commander_scores_rank_idx" ON "commander_scores" USING btree ("user_id","rank_score" DESC NULLS LAST,"oracle_id");
