CREATE TABLE "commander_pair_support" (
	"commander_oracle_id" uuid NOT NULL,
	"partner_oracle_id" uuid NOT NULL,
	"synergy_state" text NOT NULL,
	"edhrec_total" integer,
	"deck_count" integer,
	"rank" integer,
	"bracket_counts" jsonb NOT NULL,
	"avg_land" integer,
	"avg_basic" integer,
	"avg_nonbasic" integer,
	"avg_creature" integer,
	"avg_instant" integer,
	"avg_sorcery" integer,
	"avg_artifact" integer,
	"avg_enchantment" integer,
	"avg_planeswalker" integer,
	"avg_battle" integer,
	"avg_curve" jsonb,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commander_pair_support_commander_oracle_id_partner_oracle_id_pk" PRIMARY KEY("commander_oracle_id","partner_oracle_id"),
	CONSTRAINT "commander_pair_support_order_check" CHECK ("commander_pair_support"."commander_oracle_id" < "commander_pair_support"."partner_oracle_id"),
	CONSTRAINT "commander_pair_support_total_null_check" CHECK (("commander_pair_support"."synergy_state" = 'ok') = ("commander_pair_support"."edhrec_total" is not null))
);
--> statement-breakpoint
CREATE TABLE "commander_pair_support_cards" (
	"commander_oracle_id" uuid NOT NULL,
	"partner_oracle_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"inclusion" real,
	"synergy" real,
	"position" integer NOT NULL,
	CONSTRAINT "commander_pair_support_cards_commander_oracle_id_partner_oracle_id_oracle_id_pk" PRIMARY KEY("commander_oracle_id","partner_oracle_id","oracle_id")
);
--> statement-breakpoint
CREATE TABLE "edhrec_pair_cache" (
	"commander_oracle_id" uuid NOT NULL,
	"partner_oracle_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "edhrec_pair_cache_commander_oracle_id_partner_oracle_id_pk" PRIMARY KEY("commander_oracle_id","partner_oracle_id"),
	CONSTRAINT "edhrec_pair_cache_order_check" CHECK ("edhrec_pair_cache"."commander_oracle_id" < "edhrec_pair_cache"."partner_oracle_id")
);
--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_land" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_basic" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_nonbasic" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_creature" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_instant" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_sorcery" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_artifact" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_enchantment" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_planeswalker" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_battle" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_curve" jsonb;--> statement-breakpoint
ALTER TABLE "commander_pair_support" ADD CONSTRAINT "commander_pair_support_commander_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commander_pair_support" ADD CONSTRAINT "commander_pair_support_partner_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("partner_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commander_pair_support_cards" ADD CONSTRAINT "commander_pair_support_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commander_pair_support_cards" ADD CONSTRAINT "commander_pair_support_cards_commander_oracle_id_partner_oracle_id_commander_pair_support_commander_oracle_id_partner_oracle_id_fk" FOREIGN KEY ("commander_oracle_id","partner_oracle_id") REFERENCES "public"."commander_pair_support"("commander_oracle_id","partner_oracle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edhrec_pair_cache" ADD CONSTRAINT "edhrec_pair_cache_commander_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edhrec_pair_cache" ADD CONSTRAINT "edhrec_pair_cache_partner_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("partner_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commander_pair_support_cards_oracle_idx" ON "commander_pair_support_cards" USING btree ("oracle_id");