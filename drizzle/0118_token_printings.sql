CREATE TABLE "deck_token_printings" (
	"deck_id" uuid NOT NULL,
	"token_oracle_id" uuid NOT NULL,
	"token_printing_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_token_printings_deck_id_token_oracle_id_pk" PRIMARY KEY("deck_id","token_oracle_id")
);
--> statement-breakpoint
CREATE TABLE "token_printing_holdings" (
	"user_id" text NOT NULL,
	"token_printing_id" uuid NOT NULL,
	"source" text NOT NULL,
	"quantity" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "token_printing_holdings_user_id_token_printing_id_source_pk" PRIMARY KEY("user_id","token_printing_id","source"),
	CONSTRAINT "token_printing_holdings_quantity_positive" CHECK ("token_printing_holdings"."quantity" > 0),
	CONSTRAINT "token_printing_holdings_source_check" CHECK ("token_printing_holdings"."source" in ('upload', 'precon'))
);
--> statement-breakpoint
ALTER TABLE "deck_token_printings" ADD CONSTRAINT "deck_token_printings_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_token_printings" ADD CONSTRAINT "deck_token_printings_token_oracle_id_tokens_oracle_id_fk" FOREIGN KEY ("token_oracle_id") REFERENCES "public"."tokens"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_token_printings" ADD CONSTRAINT "deck_token_printings_token_printing_id_token_printings_scryfall_id_fk" FOREIGN KEY ("token_printing_id") REFERENCES "public"."token_printings"("scryfall_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_printing_holdings" ADD CONSTRAINT "token_printing_holdings_token_printing_id_token_printings_scryfall_id_fk" FOREIGN KEY ("token_printing_id") REFERENCES "public"."token_printings"("scryfall_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_token_printings_user_idx" ON "deck_token_printings" USING btree ("user_id");