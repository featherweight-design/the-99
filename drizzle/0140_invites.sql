CREATE TABLE "invite_balances" (
	"user_id" text PRIMARY KEY NOT NULL,
	"held" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invite_balances_held_check" CHECK ("invite_balances"."held" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invite_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_user_id" text,
	"invitee_user_id" text,
	"kind" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"receipt_shown_at" timestamp,
	CONSTRAINT "invite_edges_kind_check" CHECK ("invite_edges"."kind" in ('email', 'qr'))
);
--> statement-breakpoint
CREATE TABLE "invite_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"state" text NOT NULL,
	"qr_token_hash" text,
	"qr_expires_at" timestamp,
	"holds_until" timestamp,
	"email" text,
	"clerk_invitation_id" text,
	"claim_secret_hash" text,
	"code_hmac" text,
	"code_expires_at" timestamp,
	"code_sent_at" timestamp,
	"code_tries" integer DEFAULT 0 NOT NULL,
	"proven_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	CONSTRAINT "invite_reservations_qr_token_hash_unique" UNIQUE("qr_token_hash"),
	CONSTRAINT "invite_reservations_kind_check" CHECK ("invite_reservations"."kind" in ('email', 'qr')),
	CONSTRAINT "invite_reservations_state_check" CHECK ("invite_reservations"."state" in ('qr_open', 'claimed', 'reserved', 'spent', 'returned', 'revoked')),
	CONSTRAINT "invite_reservations_kind_state_check" CHECK (("invite_reservations"."kind" = 'qr' and "invite_reservations"."state" <> 'reserved') or ("invite_reservations"."kind" = 'email' and "invite_reservations"."state" not in ('qr_open', 'claimed'))),
	CONSTRAINT "invite_reservations_qr_check" CHECK (("invite_reservations"."kind" = 'qr') = ("invite_reservations"."qr_token_hash" is not null and "invite_reservations"."qr_expires_at" is not null)),
	CONSTRAINT "invite_reservations_waiting_check" CHECK ("invite_reservations"."state" not in ('claimed', 'reserved') or ("invite_reservations"."holds_until" is not null and "invite_reservations"."email" is not null)),
	CONSTRAINT "invite_reservations_final_check" CHECK ("invite_reservations"."state" not in ('spent', 'returned', 'revoked') or ("invite_reservations"."email" is null and "invite_reservations"."resolved_at" is not null)),
	CONSTRAINT "invite_reservations_tries_check" CHECK ("invite_reservations"."code_tries" between 0 and 5)
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
CREATE UNIQUE INDEX "invite_edges_invitee_idx" ON "invite_edges" USING btree ("invitee_user_id") WHERE "invite_edges"."invitee_user_id" is not null;--> statement-breakpoint
CREATE INDEX "invite_edges_inviter_idx" ON "invite_edges" USING btree ("inviter_user_id") WHERE "invite_edges"."inviter_user_id" is not null;--> statement-breakpoint
CREATE INDEX "invite_reservations_user_state_idx" ON "invite_reservations" USING btree ("user_id","state");--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'CARD_SCAN_ENABLED', 'CARD_SEARCH_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'MOMENTS_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'NO_COLLECTION_ENTRY_ENABLED', 'OVERVIEW_V2_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'RATE_LIMIT_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_INVITES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'UPCOMING_PRECONS_ENABLED', 'ALL_FEATURES'));