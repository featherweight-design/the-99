-- EDHREC theme pages per commander (engine plan A2, lane 58, orchestrator ruling 2026-11-20): the top 3 tags with at least 50 decks, and their cards with inclusion within the theme. New tables only, no backfill: the next index build (A3) fills them, and every reader falls back to the commander page while they are empty.
CREATE TABLE "commander_theme_support" (
	"commander_oracle_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"deck_count" integer NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commander_theme_support_commander_oracle_id_slug_pk" PRIMARY KEY("commander_oracle_id","slug"),
	CONSTRAINT "commander_theme_support_deck_count_check" CHECK ("commander_theme_support"."deck_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "commander_theme_support_cards" (
	"commander_oracle_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"inclusion" real,
	"synergy" real,
	CONSTRAINT "commander_theme_support_cards_pk" PRIMARY KEY("commander_oracle_id","slug","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "commander_theme_support" ADD CONSTRAINT "commander_theme_support_commander_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."commander_support"("commander_oracle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commander_theme_support_cards" ADD CONSTRAINT "commander_theme_support_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commander_theme_support_cards" ADD CONSTRAINT "commander_theme_support_cards_theme_fk" FOREIGN KEY ("commander_oracle_id","slug") REFERENCES "public"."commander_theme_support"("commander_oracle_id","slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commander_theme_support_cards_oracle_idx" ON "commander_theme_support_cards" USING btree ("oracle_id");