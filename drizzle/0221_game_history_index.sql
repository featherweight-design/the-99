-- Plain CREATE INDEX (the migrator runs in a transaction, so not CONCURRENTLY). deck_games held 13 rows on staging at the time of writing.
CREATE INDEX "deck_games_user_played_idx" ON "deck_games" USING btree ("user_id","played_at" DESC NULLS FIRST);
