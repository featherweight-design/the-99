CREATE TABLE "format_staples" (
	"oracle_id" uuid NOT NULL,
	"condition" text NOT NULL,
	"commanders" integer NOT NULL,
	"commander_total" integer NOT NULL,
	"avg_inclusion" real NOT NULL,
	"weighted_rank" integer NOT NULL,
	CONSTRAINT "format_staples_oracle_id_condition_pk" PRIMARY KEY("oracle_id","condition")
);
--> statement-breakpoint
CREATE TABLE "identity_composition" (
	"condition" text PRIMARY KEY NOT NULL,
	"avg_land" real NOT NULL,
	"avg_basic" real NOT NULL,
	"avg_nonbasic" real NOT NULL,
	"avg_creature" real NOT NULL,
	"avg_instant" real NOT NULL,
	"avg_sorcery" real NOT NULL,
	"avg_artifact" real NOT NULL,
	"avg_enchantment" real NOT NULL,
	"avg_planeswalker" real NOT NULL,
	"avg_battle" real NOT NULL,
	"avg_curve" jsonb,
	"commanders" integer NOT NULL,
	"with_composition" integer NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "identity_composition_witness_check" CHECK ("identity_composition"."with_composition" > 0)
);
--> statement-breakpoint
ALTER TABLE "format_staples" ADD CONSTRAINT "format_staples_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "format_staples_condition_idx" ON "format_staples" USING btree ("condition");