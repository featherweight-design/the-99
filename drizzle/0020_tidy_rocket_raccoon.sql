CREATE TABLE "fill_pass_cards" (
	"pass_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "fill_pass_cards_pass_id_oracle_id_pk" PRIMARY KEY("pass_id","oracle_id")
);
--> statement-breakpoint
CREATE TABLE "fill_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"ordinal" integer NOT NULL,
	"open_slots" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fill_passes_deck_kind_ordinal_key" UNIQUE("deck_id","kind","ordinal"),
	CONSTRAINT "fill_passes_kind_check" CHECK ("fill_passes"."kind" in ('seed', 'top_off'))
);
--> statement-breakpoint
ALTER TABLE "fill_pass_cards" ADD CONSTRAINT "fill_pass_cards_pass_id_fill_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."fill_passes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fill_pass_cards" ADD CONSTRAINT "fill_pass_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fill_passes" ADD CONSTRAINT "fill_passes_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fill_passes_deck_idx" ON "fill_passes" USING btree ("deck_id");