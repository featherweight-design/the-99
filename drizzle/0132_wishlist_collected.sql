CREATE TABLE "wishlist_collected" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"collected_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_collected_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "wishlist_collected" ADD CONSTRAINT "wishlist_collected_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A collected line's record moves its owner's data stamp, as wishlist_items does (0107).
DROP TRIGGER IF EXISTS user_data_touch ON "wishlist_collected";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "wishlist_collected"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
