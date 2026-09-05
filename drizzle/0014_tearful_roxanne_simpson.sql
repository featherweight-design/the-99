CREATE TABLE "printing_prices" (
	"scryfall_id" uuid PRIMARY KEY NOT NULL,
	"price_cents" integer,
	"price_cents_nm" integer,
	"price_cents_foil" integer,
	"price_cents_etched" integer,
	"available_quantity" integer NOT NULL,
	"buy_url" text,
	"as_of" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "printing_prices" ADD CONSTRAINT "printing_prices_scryfall_id_printings_scryfall_id_fk" FOREIGN KEY ("scryfall_id") REFERENCES "public"."printings"("scryfall_id") ON DELETE cascade ON UPDATE no action;