CREATE TABLE "scan_lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"guess_oracle_id" uuid,
	"correct" boolean NOT NULL,
	"score" real,
	"margin" real,
	"latency_ms" integer NOT NULL,
	"detector_ms" integer,
	"embed_ms" integer,
	"match_ms" integer,
	"agreed_frames" smallint DEFAULT 0 NOT NULL,
	"index_version" text NOT NULL,
	"frame" "bytea",
	CONSTRAINT "scan_lab_results_latency_check" CHECK ("scan_lab_results"."latency_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
CREATE INDEX "scan_lab_results_user_idx" ON "scan_lab_results" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'NO_COLLECTION_ENTRY_ENABLED', 'OVERVIEW_V2_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'RATE_LIMIT_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED', 'ALL_FEATURES'));