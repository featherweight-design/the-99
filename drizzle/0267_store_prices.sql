CREATE TABLE "printing_store_prices" (
	"scryfall_id" uuid NOT NULL,
	"store" text NOT NULL,
	"price_cents" integer,
	"price_cents_foil" integer,
	"price_cents_etched" integer,
	"quantity" integer,
	"quantity_foil" integer,
	"quantity_etched" integer,
	"buy_url" text,
	"buy_url_foil" text,
	"buy_url_etched" text,
	"as_of" timestamp NOT NULL,
	CONSTRAINT "printing_store_prices_scryfall_id_store_pk" PRIMARY KEY("scryfall_id","store"),
	CONSTRAINT "printing_store_prices_store_check" CHECK ("printing_store_prices"."store" in ('tcgplayer', 'cardkingdom'))
);
--> statement-breakpoint
CREATE TABLE "token_store_prices" (
	"scryfall_id" uuid NOT NULL,
	"store" text NOT NULL,
	"price_cents" integer,
	"price_cents_foil" integer,
	"price_cents_etched" integer,
	"quantity" integer,
	"quantity_foil" integer,
	"quantity_etched" integer,
	"buy_url" text,
	"buy_url_foil" text,
	"buy_url_etched" text,
	"as_of" timestamp NOT NULL,
	CONSTRAINT "token_store_prices_scryfall_id_store_pk" PRIMARY KEY("scryfall_id","store"),
	CONSTRAINT "token_store_prices_store_check" CHECK ("token_store_prices"."store" in ('tcgplayer', 'cardkingdom'))
);
--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "preferred_store" text;--> statement-breakpoint
ALTER TABLE "printing_store_prices" ADD CONSTRAINT "printing_store_prices_scryfall_id_printings_scryfall_id_fk" FOREIGN KEY ("scryfall_id") REFERENCES "public"."printings"("scryfall_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_store_prices" ADD CONSTRAINT "token_store_prices_printing_fk" FOREIGN KEY ("scryfall_id") REFERENCES "public"."token_printings"("scryfall_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "printing_store_prices_store_as_of_idx" ON "printing_store_prices" USING btree ("store","as_of");--> statement-breakpoint
CREATE INDEX "token_store_prices_store_as_of_idx" ON "token_store_prices" USING btree ("store","as_of");--> statement-breakpoint
ALTER TABLE "user_prefs" ADD CONSTRAINT "user_prefs_preferred_store_check" CHECK ("user_prefs"."preferred_store" in ('manapool', 'tcgplayer', 'cardkingdom'));