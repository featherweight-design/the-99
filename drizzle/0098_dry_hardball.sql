CREATE TABLE "mana_trade_applies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"cut_oracle_id" uuid NOT NULL,
	"add_oracle_id" uuid NOT NULL,
	"undo_snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mana_trade_applies" ADD CONSTRAINT "mana_trade_applies_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mana_trade_applies" ADD CONSTRAINT "mana_trade_applies_cut_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("cut_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mana_trade_applies" ADD CONSTRAINT "mana_trade_applies_add_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("add_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mana_trade_applies_deck_idx" ON "mana_trade_applies" USING btree ("deck_id");