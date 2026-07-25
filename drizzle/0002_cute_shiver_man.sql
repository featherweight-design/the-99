CREATE TABLE "commander_scores" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"score" real NOT NULL,
	"fit_pool" real NOT NULL,
	"fit_roles" real NOT NULL,
	"fit_synergy" real,
	"synergy_state" text NOT NULL,
	"edhrec_owned_count" integer,
	"edhrec_total" integer,
	"receipts" text NOT NULL,
	"color_pool_size" integer NOT NULL,
	"role_counts" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commander_scores_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "commander_scores" ADD CONSTRAINT "commander_scores_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commander_scores_rank_idx" ON "commander_scores" USING btree ("user_id","score" DESC NULLS LAST);