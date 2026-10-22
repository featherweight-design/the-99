CREATE TABLE "feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"oracle_id" uuid,
	"variant_id" text,
	"friend_user_id" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_items_dedupe_unique" UNIQUE("user_id","kind","dedupe_key"),
	CONSTRAINT "feed_items_kind_check" CHECK ("feed_items"."kind" in ('price-drop', 'trade-match', 'spare-request', 'combo')),
	CONSTRAINT "feed_items_not_self_check" CHECK ("feed_items"."friend_user_id" is null or "feed_items"."friend_user_id" <> "feed_items"."user_id")
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "feed_kinds" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "feed_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "friends_seen_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "feed_items_user_created_idx" ON "feed_items" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "feed_items_friend_idx" ON "feed_items" USING btree ("friend_user_id") WHERE "feed_items"."friend_user_id" is not null;--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'BRACKET_REACH_ENABLED', 'CARD_SCAN_ENABLED', 'CARD_SEARCH_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'COMMANDERS_PLACE_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'FIRST_RUN_TOUR_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HELP_PANEL_ENABLED', 'HOME_FEED_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'MOMENTS_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'NO_COLLECTION_ENTRY_ENABLED', 'OVERVIEW_V2_ENABLED', 'PAYMENTS_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'PUBLIC_PAGES_ENABLED', 'RATE_LIMIT_ENABLED', 'RULE_ZERO_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_INVITES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));