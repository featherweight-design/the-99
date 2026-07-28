CREATE TABLE "printings" (
	"scryfall_id" uuid PRIMARY KEY NOT NULL,
	"oracle_id" uuid NOT NULL,
	"set_code" text NOT NULL,
	"collector_number" text NOT NULL,
	"image_uri" text,
	"image_uri_small" text,
	"finishes" text[] NOT NULL,
	"is_variant" boolean DEFAULT false NOT NULL,
	"is_representative" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skipped_printings" (
	"scryfall_id" uuid PRIMARY KEY NOT NULL,
	"layout" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "printings" ADD CONSTRAINT "printings_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "printings_oracle_set_idx" ON "printings" USING btree ("oracle_id","set_code");--> statement-breakpoint
CREATE INDEX "printings_oracle_idx" ON "printings" USING btree ("oracle_id");