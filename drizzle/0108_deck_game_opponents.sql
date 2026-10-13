CREATE TABLE "deck_game_opponents" (
	"game_id" uuid NOT NULL,
	"seat" integer NOT NULL,
	"friend_user_id" text,
	"friend_deck_id" uuid,
	"friend_name_then" text,
	"deck_name_then" text,
	"commander_oracle_id" uuid,
	"partner_oracle_id" uuid,
	"label" text,
	"won" boolean DEFAULT false NOT NULL,
	CONSTRAINT "deck_game_opponents_game_id_seat_pk" PRIMARY KEY("game_id","seat"),
	CONSTRAINT "deck_game_opponents_seat_check" CHECK ("deck_game_opponents"."seat" between 1 and 7),
	CONSTRAINT "deck_game_opponents_label_check" CHECK ("deck_game_opponents"."label" is null or char_length("deck_game_opponents"."label") between 1 and 30),
	CONSTRAINT "deck_game_opponents_friend_name_check" CHECK ("deck_game_opponents"."friend_name_then" is null or char_length("deck_game_opponents"."friend_name_then") between 1 and 30),
	CONSTRAINT "deck_game_opponents_deck_name_check" CHECK ("deck_game_opponents"."deck_name_then" is null or char_length("deck_game_opponents"."deck_name_then") between 1 and 120),
	CONSTRAINT "deck_game_opponents_partner_check" CHECK ("deck_game_opponents"."partner_oracle_id" is null or ("deck_game_opponents"."commander_oracle_id" is not null and "deck_game_opponents"."partner_oracle_id" <> "deck_game_opponents"."commander_oracle_id")),
	CONSTRAINT "deck_game_opponents_deck_friend_check" CHECK ("deck_game_opponents"."friend_deck_id" is null or "deck_game_opponents"."friend_user_id" is not null),
	CONSTRAINT "deck_game_opponents_named_check" CHECK ("deck_game_opponents"."friend_name_then" is not null or "deck_game_opponents"."commander_oracle_id" is not null or "deck_game_opponents"."label" is not null)
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "deck_game_opponents" ADD CONSTRAINT "deck_game_opponents_game_id_deck_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."deck_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_game_opponents" ADD CONSTRAINT "deck_game_opponents_friend_deck_id_decks_id_fk" FOREIGN KEY ("friend_deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_game_opponents" ADD CONSTRAINT "deck_game_opponents_commander_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_game_opponents" ADD CONSTRAINT "deck_game_opponents_partner_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("partner_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_game_opponents_friend_idx" ON "deck_game_opponents" USING btree ("friend_user_id") WHERE "deck_game_opponents"."friend_user_id" is not null;--> statement-breakpoint
CREATE INDEX "deck_game_opponents_friend_deck_idx" ON "deck_game_opponents" USING btree ("friend_deck_id") WHERE "deck_game_opponents"."friend_deck_id" is not null;--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'OVERVIEW_V2_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED'));