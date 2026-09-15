CREATE TABLE "deck_proxies" (
	"deck_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_proxies_deck_id_oracle_id_pk" PRIMARY KEY("deck_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "deck_proxies" ADD CONSTRAINT "deck_proxies_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_proxies" ADD CONSTRAINT "deck_proxies_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_proxies_oracle_idx" ON "deck_proxies" USING btree ("oracle_id","deck_id");