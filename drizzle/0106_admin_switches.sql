CREATE TABLE "flag_group_members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flag_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "flag_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "flag_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"switch" text NOT NULL,
	"scope" text NOT NULL,
	"group_id" uuid,
	"user_id" text,
	"value" text NOT NULL,
	"note" text,
	"updated_by" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "flag_overrides_target_key" UNIQUE NULLS NOT DISTINCT("switch","scope","group_id","user_id"),
	CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ABOUT_SHEET_ENABLED', 'ADDED_COPY_ENABLED', 'ALL_DECKS_CART_ENABLED', 'ANALYSIS_TAB_ENABLED', 'CHANGE_COMMANDER_ENABLED', 'COLLECTION_EDIT_ENABLED', 'DECK_BENCHMARKS_ENABLED', 'DECK_NOTES_ENABLED', 'DECK_PRINTINGS_ENABLED', 'DECK_STATS_ENABLED', 'DECK_TOKENS_ENABLED', 'FIND_A_DECK_READ_ENABLED', 'HELP_ME_CHOOSE_ENABLED', 'HOW_IT_WORKS_ENABLED', 'LABEL_ROLE_COUNTS_ENABLED', 'LABEL_SURFACES_ENABLED', 'LINEUP_ENABLED', 'LIST_CACHE_ENABLED', 'MANA_BALANCE_ENABLED', 'NEVER_CUT_ENABLED', 'NOTICES_ENABLED', 'OVERVIEW_V2_ENABLED', 'PRECONS_ENABLED', 'PROPOSED_CUTS_ENABLED', 'SHOPPING_MARK_BOUGHT_ENABLED', 'SOCIAL_FRIENDS_ENABLED', 'STAND_IN_LABELS_ENABLED', 'SWAP_TOOLS_ENABLED', 'TUNING_ENABLED')),
	CONSTRAINT "flag_overrides_scope_check" CHECK ("flag_overrides"."scope" in ('app', 'group', 'user')),
	CONSTRAINT "flag_overrides_value_check" CHECK ("flag_overrides"."value" in ('on', 'off')),
	CONSTRAINT "flag_overrides_target_check" CHECK (("flag_overrides"."scope" = 'app' and "flag_overrides"."group_id" is null and "flag_overrides"."user_id" is null)
    or ("flag_overrides"."scope" = 'group' and "flag_overrides"."group_id" is not null and "flag_overrides"."user_id" is null)
    or ("flag_overrides"."scope" = 'user' and "flag_overrides"."user_id" is not null and "flag_overrides"."group_id" is null))
);
--> statement-breakpoint
ALTER TABLE "flag_group_members" ADD CONSTRAINT "flag_group_members_group_id_flag_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."flag_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_group_id_flag_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."flag_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flag_group_members_group_idx" ON "flag_group_members" USING btree ("group_id");