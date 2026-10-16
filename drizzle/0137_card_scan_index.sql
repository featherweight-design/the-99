-- pgvector, for scan_index's halfvec rows and HNSW index (card scanning, plan 2026-10-16-card-scan.md).
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "scan_index" (
	"scryfall_id" uuid NOT NULL,
	"face" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"embedding" halfvec(256) NOT NULL,
	CONSTRAINT "scan_index_scryfall_id_face_pk" PRIMARY KEY("scryfall_id","face"),
	CONSTRAINT "scan_index_face_check" CHECK ("scan_index"."face" in ('front', 'back'))
);
--> statement-breakpoint
CREATE TABLE "scan_index_meta" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"version" text NOT NULL,
	"model" text NOT NULL,
	"rows" integer NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scan_index_meta_single" CHECK (id = 1)
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
CREATE INDEX "scan_index_embedding_idx" ON "scan_index" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'CARD_SCAN_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'NO_COLLECTION_ENTRY_ENABLED', 'OVERVIEW_V2_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'RATE_LIMIT_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED', 'ALL_FEATURES'));