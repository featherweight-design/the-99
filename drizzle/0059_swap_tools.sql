CREATE TABLE "deck_swaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"cut_oracle_id" uuid NOT NULL,
	"add_oracle_id" uuid NOT NULL,
	"add_was_free" boolean NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"undone_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "shopping_limit_cents" integer;--> statement-breakpoint
ALTER TABLE "deck_swaps" ADD CONSTRAINT "deck_swaps_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_swaps" ADD CONSTRAINT "deck_swaps_cut_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("cut_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_swaps" ADD CONSTRAINT "deck_swaps_add_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("add_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_swaps_deck_idx" ON "deck_swaps" USING btree ("deck_id");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_shopping_limit_check" CHECK ("decks"."shopping_limit_cents" is null or ("decks"."shopping_limit_cents" >= 100 and "decks"."shopping_limit_cents" % 100 = 0));