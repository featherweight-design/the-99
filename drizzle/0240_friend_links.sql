-- Friend links R1 (design_handoff_the99_friends_link, PR 1a): `friend_link_keys` (one live reusable link and code per player,
-- stored only as the token's SHA-256 and the code's keyed HMAC; retired rows kept so a code is never reissued) and
-- `friend_requests` (one row per ordered pair), plus the switch FRIEND_LINKS_ENABLED in flag_overrides_switch_check.
-- REVERSAL, in this order: DROP TABLE "friend_requests"; DROP TABLE "friend_link_keys";
-- DELETE FROM "flag_overrides" WHERE "switch" = 'FRIEND_LINKS_ENABLED'; then drop and re-add flag_overrides_switch_check
-- with 0237's list (the same statement without the new value).
CREATE TABLE "friend_link_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"token_hash" text NOT NULL,
	"code_hmac" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "friend_link_keys_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "friend_link_keys_code_hmac_unique" UNIQUE("code_hmac"),
	CONSTRAINT "friend_link_keys_unlinked_check" CHECK ("friend_link_keys"."user_id" is not null or "friend_link_keys"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_user_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"via" text NOT NULL,
	"state" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"noticed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "friend_requests_pair_key" UNIQUE("requester_user_id","owner_user_id"),
	CONSTRAINT "friend_requests_not_self_check" CHECK ("friend_requests"."requester_user_id" <> "friend_requests"."owner_user_id"),
	CONSTRAINT "friend_requests_via_check" CHECK ("friend_requests"."via" in ('link', 'code')),
	CONSTRAINT "friend_requests_state_check" CHECK ("friend_requests"."state" in ('waiting', 'accepted', 'declined', 'withdrawn')),
	CONSTRAINT "friend_requests_answered_check" CHECK (("friend_requests"."state" in ('accepted', 'declined')) = ("friend_requests"."answered_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
CREATE UNIQUE INDEX "friend_link_keys_one_live" ON "friend_link_keys" USING btree ("user_id") WHERE "friend_link_keys"."retired_at" is null;--> statement-breakpoint
CREATE INDEX "friend_requests_owner_idx" ON "friend_requests" USING btree ("owner_user_id","state");--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ANNOUNCEMENTS_ENABLED', 'FEEDBACK_ENABLED', 'FLYER_TRIAL_ENABLED', 'FRIEND_LINKS_ENABLED', 'LIST_CACHE_ENABLED', 'MODEL_CALLS_ENABLED', 'PAYMENTS_ENABLED', 'PRECON_UPGRADE_ENABLED', 'PUSH_ENABLED', 'PUBLIC_LANDING_ENABLED', 'PUBLIC_PAGES_ENABLED', 'SCAN_LAB_ENABLED', 'SUGGESTED_CHANGES_V2_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));