CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"answers" jsonb NOT NULL,
	"page" text,
	"device" text,
	"digest" text,
	"sentry_event_id" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	CONSTRAINT "feedback_kind_check" CHECK ("feedback"."kind" in ('problem', 'check_in'))
);
--> statement-breakpoint
CREATE TABLE "flyer_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_id" uuid NOT NULL,
	"state" text NOT NULL,
	"holds_until" timestamp NOT NULL,
	"email" text,
	"clerk_invitation_id" text,
	"claim_secret_hash" text NOT NULL,
	"code_hmac" text,
	"code_expires_at" timestamp,
	"code_sent_at" timestamp,
	"code_tries" integer DEFAULT 0 NOT NULL,
	"proven_at" timestamp,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	CONSTRAINT "flyer_claims_state_check" CHECK ("flyer_claims"."state" in ('open', 'proven', 'spent', 'released')),
	CONSTRAINT "flyer_claims_tries_check" CHECK ("flyer_claims"."code_tries" between 0 and 5),
	CONSTRAINT "flyer_claims_final_check" CHECK ("flyer_claims"."state" not in ('spent', 'released') or ("flyer_claims"."email" is null and "flyer_claims"."resolved_at" is not null)),
	CONSTRAINT "flyer_claims_spent_check" CHECK (("flyer_claims"."state" = 'spent') = ("flyer_claims"."user_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "flyer_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"group_id" uuid,
	"capacity" integer DEFAULT 50 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "flyer_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "flyer_codes_capacity_check" CHECK ("flyer_codes"."capacity" between 1 and 50),
	CONSTRAINT "flyer_codes_code_check" CHECK ("flyer_codes"."code" ~ '^[A-HJ-NP-Z2-9]{6}$')
);
--> statement-breakpoint
CREATE TABLE "launch_list" (
	"email" text PRIMARY KEY NOT NULL,
	"code_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "flyer_claims" ADD CONSTRAINT "flyer_claims_code_id_flyer_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."flyer_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flyer_codes" ADD CONSTRAINT "flyer_codes_group_id_flag_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."flag_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launch_list" ADD CONSTRAINT "launch_list_code_id_flyer_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."flyer_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_created_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flyer_claims_code_state_idx" ON "flyer_claims" USING btree ("code_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "flyer_claims_user_idx" ON "flyer_claims" USING btree ("user_id") WHERE "flyer_claims"."user_id" is not null;--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'ANNOUNCEMENTS_ENABLED', 'BRACKET_REACH_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'COLLECTION_SYNC_ENABLED', 'COMMANDERS_PLACE_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'FEEDBACK_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'FLYER_TRIAL_ENABLED', 'FRIEND_DECKS_ENABLED', 'HOME_FEED_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NAV_STALL_LOG_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'OVERVIEW_V2_ENABLED', 'PAYMENTS_ENABLED', 'PUSH_ENABLED', 'PROPOSED_CUTS_ENABLED', 'PUBLIC_PAGES_ENABLED', 'RATE_LIMIT_ENABLED', 'RULE_ZERO_ENABLED', 'SCAN_LAB_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SIGNATURE_CARD_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_GAMES_ENABLED', 'SOCIAL_INVITES_ENABLED', 'SOCIAL_WISHLIST_ENABLED', 'SPARE_REQUESTS_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SUGGESTED_CHANGES_V2_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));