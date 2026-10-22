CREATE TABLE "spare_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asker_user_id" text NOT NULL,
	"holder_user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "spare_requests_status_check" CHECK ("spare_requests"."status" in ('open', 'yes', 'no', 'expired')),
	CONSTRAINT "spare_requests_answered_check" CHECK (("spare_requests"."status" in ('yes', 'no')) = ("spare_requests"."answered_at" is not null)),
	CONSTRAINT "spare_requests_not_self_check" CHECK ("spare_requests"."asker_user_id" <> "spare_requests"."holder_user_id")
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "spare_requests" ADD CONSTRAINT "spare_requests_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spare_requests_one_open" ON "spare_requests" USING btree ("asker_user_id","oracle_id") WHERE "spare_requests"."status" = 'open';--> statement-breakpoint
CREATE INDEX "spare_requests_holder_idx" ON "spare_requests" USING btree ("holder_user_id","status");--> statement-breakpoint
CREATE INDEX "spare_requests_asker_idx" ON "spare_requests" USING btree ("asker_user_id","created_at");--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'BRACKET_REACH_ENABLED', 'CARD_SCAN_ENABLED', 'CARD_SEARCH_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'COMMANDERS_PLACE_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'FIRST_RUN_TOUR_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HELP_PANEL_ENABLED', 'HOME_FEED_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'MOMENTS_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'NO_COLLECTION_ENTRY_ENABLED', 'OVERVIEW_V2_ENABLED', 'PAYMENTS_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'PUBLIC_PAGES_ENABLED', 'RATE_LIMIT_ENABLED', 'RULE_ZERO_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_INVITES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'SPARE_REQUESTS_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));