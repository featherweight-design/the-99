CREATE TABLE "wishlist_sync_skips" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_sync_skips_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id")
);
--> statement-breakpoint
CREATE TABLE "wishlist_sync_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"synced_stamp" bigint NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_synced" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"held" integer NOT NULL,
	"quiet" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_synced_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id"),
	CONSTRAINT "wishlist_synced_quantity_check" CHECK ("wishlist_synced"."quantity" between 1 and 99),
	CONSTRAINT "wishlist_synced_held_check" CHECK ("wishlist_synced"."held" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wishlist_synced_decks" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"deck_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unfinished" boolean NOT NULL,
	CONSTRAINT "wishlist_synced_decks_user_id_oracle_id_deck_id_pk" PRIMARY KEY("user_id","oracle_id","deck_id"),
	CONSTRAINT "wishlist_synced_decks_quantity_check" CHECK ("wishlist_synced_decks"."quantity" >= 1)
);
--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "off_wishlist" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "wishlist_sync" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "wishlist_offer_dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wishlist_sync_skips" ADD CONSTRAINT "wishlist_sync_skips_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_synced" ADD CONSTRAINT "wishlist_synced_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_synced_decks" ADD CONSTRAINT "wishlist_synced_decks_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_synced_decks" ADD CONSTRAINT "wishlist_synced_decks_line_fk" FOREIGN KEY ("user_id","oracle_id") REFERENCES "public"."wishlist_synced"("user_id","oracle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishlist_synced_decks_deck_id_idx" ON "wishlist_synced_decks" USING btree ("deck_id");--> statement-breakpoint
-- A synced line's write moves its owner's data stamp, as every per-user table a cached page may read does. The sync
-- writes diff-only, so a recompute that changes nothing fires neither trigger and leaves the stamp where it was.
DROP TRIGGER IF EXISTS user_data_touch ON "wishlist_synced";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "wishlist_synced"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "wishlist_synced_decks";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "wishlist_synced_decks"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
