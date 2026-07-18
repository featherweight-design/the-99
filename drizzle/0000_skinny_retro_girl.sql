CREATE TABLE "cards" (
	"oracle_id" uuid PRIMARY KEY NOT NULL,
	"scryfall_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mana_cost" text,
	"cmc" real DEFAULT 0 NOT NULL,
	"color_identity" text[] NOT NULL,
	"type_line" text NOT NULL,
	"oracle_text" text,
	"keywords" text[] NOT NULL,
	"commander_legal" boolean NOT NULL,
	"image_uri" text,
	"rarity" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"set_code" text NOT NULL,
	"foil" boolean DEFAULT false NOT NULL,
	"condition" text,
	CONSTRAINT "collection_items_user_id_oracle_id_set_code_foil_pk" PRIMARY KEY("user_id","oracle_id","set_code","foil")
);
--> statement-breakpoint
CREATE TABLE "csv_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"row_count" integer NOT NULL,
	"unmatched_count" integer NOT NULL,
	"preview_payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_cards" (
	"deck_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "deck_cards_deck_id_oracle_id_pk" PRIMARY KEY("deck_id","oracle_id")
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"commander_oracle_id" uuid NOT NULL,
	"status" text DEFAULT 'brewing' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edhrec_cache" (
	"commander_oracle_id" uuid PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_commander_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edhrec_cache" ADD CONSTRAINT "edhrec_cache_commander_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_name_idx" ON "cards" USING btree ("name");