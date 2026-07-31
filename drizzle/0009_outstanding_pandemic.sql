CREATE TABLE "card_art_preferences" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"set_code" text NOT NULL,
	"collector_number" text DEFAULT '' NOT NULL,
	CONSTRAINT "card_art_preferences_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "card_art_preferences" ADD CONSTRAINT "card_art_preferences_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;