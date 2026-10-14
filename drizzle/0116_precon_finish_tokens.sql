CREATE TABLE "precon_tokens" (
	"file_name" text NOT NULL,
	"token_printing_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "precon_tokens_file_name_token_printing_id_pk" PRIMARY KEY("file_name","token_printing_id"),
	CONSTRAINT "precon_tokens_quantity_check" CHECK ("precon_tokens"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "precon_cards" ADD COLUMN "foil_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "precon_tokens" ADD CONSTRAINT "precon_tokens_file_name_precons_file_name_fk" FOREIGN KEY ("file_name") REFERENCES "public"."precons"("file_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precon_tokens" ADD CONSTRAINT "precon_tokens_token_printing_id_token_printings_scryfall_id_fk" FOREIGN KEY ("token_printing_id") REFERENCES "public"."token_printings"("scryfall_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precon_cards" ADD CONSTRAINT "precon_cards_foil_check" CHECK ("precon_cards"."foil_quantity" >= 0 and "precon_cards"."foil_quantity" <= "precon_cards"."quantity");