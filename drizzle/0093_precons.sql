CREATE TABLE "precon_cards" (
	"file_name" text NOT NULL,
	"position" integer NOT NULL,
	"oracle_id" uuid NOT NULL,
	"scryfall_id" uuid,
	"quantity" integer NOT NULL,
	"is_commander" boolean NOT NULL,
	CONSTRAINT "precon_cards_file_name_position_pk" PRIMARY KEY("file_name","position"),
	CONSTRAINT "precon_cards_quantity_check" CHECK ("precon_cards"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "precons" (
	"file_name" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"set_code" text NOT NULL,
	"release_date" date NOT NULL,
	"twin_of" text,
	"unmapped_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "precons_twin_check" CHECK ("precons"."twin_of" is null or "precons"."twin_of" <> "precons"."file_name"),
	CONSTRAINT "precons_unmapped_check" CHECK ("precons"."unmapped_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "catalog_sources" DROP CONSTRAINT "catalog_sources_source_check";--> statement-breakpoint
ALTER TABLE "precon_cards" ADD CONSTRAINT "precon_cards_file_name_precons_file_name_fk" FOREIGN KEY ("file_name") REFERENCES "public"."precons"("file_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precon_cards" ADD CONSTRAINT "precon_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precon_cards" ADD CONSTRAINT "precon_cards_scryfall_id_printings_scryfall_id_fk" FOREIGN KEY ("scryfall_id") REFERENCES "public"."printings"("scryfall_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "precon_cards_oracle_idx" ON "precon_cards" USING btree ("oracle_id");--> statement-breakpoint
ALTER TABLE "catalog_sources" ADD CONSTRAINT "catalog_sources_source_check" CHECK ("catalog_sources"."source" in ('sets', 'oracle_cards', 'default_cards', 'prices', 'precons'));