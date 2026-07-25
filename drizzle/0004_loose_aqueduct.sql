DROP INDEX "commander_scores_rank_idx";--> statement-breakpoint
CREATE INDEX "commander_scores_rank_idx" ON "commander_scores" USING btree ("user_id","score" DESC NULLS LAST,"oracle_id");