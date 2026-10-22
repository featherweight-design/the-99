CREATE TABLE "push_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_key" text NOT NULL,
	"batch_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "push_outbox_kind_check" CHECK ("push_outbox"."kind" in ('new-set', 'new-precon', 'price-drop', 'trade-match', 'spare-request', 'combo'))
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_ok_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_check" CHECK (length("push_subscriptions"."endpoint") between 1 and 2048 and "push_subscriptions"."endpoint" like 'https://%'),
	CONSTRAINT "push_subscriptions_user_agent_check" CHECK (length("push_subscriptions"."user_agent") <= 200)
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "push_kinds" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "push_kinds_declined" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "push_outbox_item_idx" ON "push_outbox" USING btree ("user_id","kind","item_key");--> statement-breakpoint
CREATE INDEX "push_outbox_due_idx" ON "push_outbox" USING btree ("user_id","created_at") WHERE "push_outbox"."sent_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'BRACKET_REACH_ENABLED', 'CARD_SCAN_ENABLED', 'CARD_SEARCH_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'COMMANDERS_PLACE_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'FIRST_RUN_TOUR_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HELP_PANEL_ENABLED', 'FRIEND_DECKS_ENABLED', 'HOME_FEED_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'MOMENTS_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEAR_COMBOS_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'NO_COLLECTION_ENTRY_ENABLED', 'OVERVIEW_V2_ENABLED', 'PAYMENTS_ENABLED', 'PRECONS_ENABLED', 'PUSH_ENABLED', 'PROPOSED_CUTS_ENABLED', 'PUBLIC_PAGES_ENABLED', 'RATE_LIMIT_ENABLED', 'RULE_ZERO_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_INVITES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'SPARE_REQUESTS_ENABLED', 'STAND_IN_LABELS_ENABLED', 'STRATEGY_FOCUS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));