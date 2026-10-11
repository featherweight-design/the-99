CREATE TABLE "card_tokens" (
	"card_oracle_id" uuid NOT NULL,
	"token_oracle_id" uuid NOT NULL,
	CONSTRAINT "card_tokens_card_oracle_id_token_oracle_id_pk" PRIMARY KEY("card_oracle_id","token_oracle_id")
);
--> statement-breakpoint
CREATE TABLE "token_printings" (
	"scryfall_id" uuid PRIMARY KEY NOT NULL,
	"token_oracle_id" uuid NOT NULL,
	"set_code" text NOT NULL,
	"collector_number" text NOT NULL,
	"image_uri" text,
	"image_uri_small" text,
	"art_crop_uri" text,
	"back_image_uri" text,
	"finishes" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"oracle_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type_line" text NOT NULL,
	"colors" text[] NOT NULL,
	"power" text,
	"toughness" text,
	"layout" text NOT NULL,
	"oracle_text" text
);
--> statement-breakpoint
ALTER TABLE "card_tokens" ADD CONSTRAINT "card_tokens_card_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("card_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_tokens" ADD CONSTRAINT "card_tokens_token_oracle_id_tokens_oracle_id_fk" FOREIGN KEY ("token_oracle_id") REFERENCES "public"."tokens"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_printings" ADD CONSTRAINT "token_printings_token_oracle_id_tokens_oracle_id_fk" FOREIGN KEY ("token_oracle_id") REFERENCES "public"."tokens"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_tokens_token_idx" ON "card_tokens" USING btree ("token_oracle_id");--> statement-breakpoint
CREATE INDEX "token_printings_token_idx" ON "token_printings" USING btree ("token_oracle_id");