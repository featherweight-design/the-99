CREATE TABLE "wishlist_items" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_items_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id"),
	CONSTRAINT "wishlist_items_quantity_check" CHECK ("wishlist_items"."quantity" between 1 and 99)
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'OVERVIEW_V2_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED'));--> statement-breakpoint
-- A wishlist write moves its owner's data stamp, as every per-user table a cached page may read does.
DROP TRIGGER IF EXISTS user_data_touch ON "wishlist_items";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "wishlist_items"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
