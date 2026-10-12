CREATE TABLE "deck_token_joins" (
	"deck_id" uuid NOT NULL,
	"token_oracle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_token_joins_deck_id_token_oracle_id_pk" PRIMARY KEY("deck_id","token_oracle_id")
);
--> statement-breakpoint
ALTER TABLE "deck_token_joins" ADD CONSTRAINT "deck_token_joins_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_token_joins" ADD CONSTRAINT "deck_token_joins_token_oracle_id_tokens_oracle_id_fk" FOREIGN KEY ("token_oracle_id") REFERENCES "public"."tokens"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_token_joins_user_idx" ON "deck_token_joins" USING btree ("user_id");