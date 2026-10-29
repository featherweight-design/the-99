CREATE TABLE "wizards_announcement_decklists" (
	"announcement_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text,
	"commander_card_id" uuid,
	"commander_name" text,
	"partner_card_id" uuid,
	"partner_name" text,
	"partner_role" text,
	"commander_candidate" text,
	"card_count" integer NOT NULL,
	"cards" jsonb NOT NULL,
	"unmatched" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "wizards_announcement_decklists_announcement_id_position_pk" PRIMARY KEY("announcement_id","position"),
	CONSTRAINT "wizards_announcement_decklists_partner_role_check" CHECK (("wizards_announcement_decklists"."partner_role" is null and "wizards_announcement_decklists"."partner_name" is null) or ("wizards_announcement_decklists"."partner_role" in ('co-commander', 'alternate') and "wizards_announcement_decklists"."partner_name" is not null)),
	CONSTRAINT "wizards_announcement_decklists_position_check" CHECK ("wizards_announcement_decklists"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wizards_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contentful_id" text NOT NULL,
	"url" text NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"excerpt" text,
	"hero_image_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"lastmod" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_fetched_at" timestamp with time zone NOT NULL,
	"promised_decks" integer,
	"parse_status" text NOT NULL,
	"baseline" boolean DEFAULT false NOT NULL,
	CONSTRAINT "wizards_announcements_contentful_id_unique" UNIQUE("contentful_id"),
	CONSTRAINT "wizards_announcements_kind_check" CHECK ("wizards_announcements"."kind" in ('secret-lair', 'commander-decklists', 'wizards-news')),
	CONSTRAINT "wizards_announcements_parse_status_check" CHECK ("wizards_announcements"."parse_status" in ('ok', 'empty', 'incomplete')),
	CONSTRAINT "wizards_announcements_promised_check" CHECK ("wizards_announcements"."promised_decks" is null or "wizards_announcements"."promised_decks" > 0)
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "push_outbox" DROP CONSTRAINT "push_outbox_kind_check";--> statement-breakpoint
ALTER TABLE "wizards_announcement_decklists" ADD CONSTRAINT "wizards_announcement_decklists_post_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."wizards_announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizards_announcement_decklists" ADD CONSTRAINT "wizards_announcement_decklists_commander_fk" FOREIGN KEY ("commander_card_id") REFERENCES "public"."cards"("oracle_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizards_announcement_decklists" ADD CONSTRAINT "wizards_announcement_decklists_partner_fk" FOREIGN KEY ("partner_card_id") REFERENCES "public"."cards"("oracle_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wizards_announcements_url_idx" ON "wizards_announcements" USING btree ("url");--> statement-breakpoint
CREATE INDEX "wizards_announcements_published_idx" ON "wizards_announcements" USING btree ("published_at");--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'ANNOUNCEMENTS_ENABLED', 'BRACKET_REACH_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'COMMANDERS_PLACE_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'FRIEND_DECKS_ENABLED', 'HOME_FEED_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'OVERVIEW_V2_ENABLED', 'PAYMENTS_ENABLED', 'PRECONS_ENABLED', 'PUSH_ENABLED', 'PROPOSED_CUTS_ENABLED', 'PUBLIC_PAGES_ENABLED', 'RATE_LIMIT_ENABLED', 'RULE_ZERO_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SIGNATURE_CARD_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_INVITES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'SPARE_REQUESTS_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SUGGESTED_CHANGES_V2_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));--> statement-breakpoint
ALTER TABLE "push_outbox" ADD CONSTRAINT "push_outbox_kind_check" CHECK ("push_outbox"."kind" in ('new-set', 'new-precon', 'price-drop', 'trade-match', 'spare-request', 'combo', 'secret-lair', 'commander-decklists', 'wizards-news'));