ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'OVERVIEW_V2_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'RATE_LIMIT_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED'));--> statement-breakpoint
-- The reader's data stamp moves at COMMIT when their `user_prefs` row does (upcoming precons, E5): Home and
-- Precons carry the upcoming seen state in their cached payloads, and a dismiss or a Precons visit has to retire them.
-- Deferred like every other `user_data_touch` trigger, so it is the last lock a transaction takes (0073).
DROP TRIGGER IF EXISTS user_data_touch ON "user_prefs";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "user_prefs"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
