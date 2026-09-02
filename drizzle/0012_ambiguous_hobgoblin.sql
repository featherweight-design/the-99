CREATE TABLE "commander_support" (
	"commander_oracle_id" uuid PRIMARY KEY NOT NULL,
	"synergy_state" text NOT NULL,
	"edhrec_total" integer,
	"tags" jsonb NOT NULL,
	"bracket_counts" jsonb NOT NULL,
	"budget_counts" jsonb NOT NULL,
	"similar_oracle_ids" uuid[] NOT NULL,
	"deck_count" integer,
	"rank" integer,
	"salt_score" real,
	"engine" text,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commander_support_synergy_state_check" CHECK ("commander_support"."synergy_state" in ('ok', 'absent', 'degraded')),
	CONSTRAINT "commander_support_total_null_check" CHECK (("commander_support"."synergy_state" = 'ok') = ("commander_support"."edhrec_total" is not null)),
	CONSTRAINT "commander_support_engine_check" CHECK ("commander_support"."engine" is null or "commander_support"."engine" in ('etb', 'triggered', 'activated', 'tap', 'static'))
);
--> statement-breakpoint
CREATE TABLE "commander_support_cards" (
	"commander_oracle_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"inclusion" real,
	"synergy" real,
	CONSTRAINT "commander_support_cards_commander_oracle_id_oracle_id_pk" PRIMARY KEY("commander_oracle_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "commander_support" ADD CONSTRAINT "commander_support_commander_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commander_support_cards" ADD CONSTRAINT "commander_support_cards_commander_oracle_id_commander_support_commander_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."commander_support"("commander_oracle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commander_support_cards" ADD CONSTRAINT "commander_support_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commander_support_cards_oracle_idx" ON "commander_support_cards" USING btree ("oracle_id");