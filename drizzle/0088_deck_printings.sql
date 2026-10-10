CREATE TABLE "deck_printings" (
	"deck_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"set_code" text NOT NULL,
	"collector_number" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_printings_deck_id_oracle_id_pk" PRIMARY KEY("deck_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "deck_version_cards" ADD COLUMN "set_code" text;--> statement-breakpoint
ALTER TABLE "deck_version_cards" ADD COLUMN "collector_number" text;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD COLUMN "commander_set_code" text;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD COLUMN "commander_collector_number" text;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD COLUMN "partner_set_code" text;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD COLUMN "partner_collector_number" text;--> statement-breakpoint
ALTER TABLE "deck_printings" ADD CONSTRAINT "deck_printings_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_printings" ADD CONSTRAINT "deck_printings_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Home and `/decks` key their cached payload on the reader's stamp (0073), and both read deck
-- tiles' commander art, which a pick moves. Deferred to commit like every other user_data_touch.
DROP TRIGGER IF EXISTS user_data_touch ON "deck_printings";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_printings"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('deck_id');
