CREATE TABLE "token_printing_prices" (
	"scryfall_id" uuid PRIMARY KEY NOT NULL,
	"price_cents" integer,
	"price_cents_nm" integer,
	"price_cents_foil" integer,
	"price_cents_etched" integer,
	"available_quantity" integer NOT NULL,
	"buy_url" text,
	"as_of" timestamp NOT NULL,
	"product_name" text,
	"product_set" text,
	"product_number" text
);
--> statement-breakpoint
ALTER TABLE "token_printing_prices" ADD CONSTRAINT "token_prices_printing_fk" FOREIGN KEY ("scryfall_id") REFERENCES "public"."token_printings"("scryfall_id") ON DELETE cascade ON UPDATE no action;