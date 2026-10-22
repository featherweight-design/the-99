-- Settings' Spares (menu and Home PR 3, G3): `user_prefs.spare_min`, the fewest spare copies a card is offered at (1 is
-- every spare, the behavior before it), and `spare_keep`, the cards an account keeps back. `user_prefs` already carries the
-- `user_data_touch` stamp trigger (0123).
CREATE TABLE "spare_keep" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "spare_keep_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "spare_min" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "spare_keep" ADD CONSTRAINT "spare_keep_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD CONSTRAINT "user_prefs_spare_min_check" CHECK ("user_prefs"."spare_min" between 1 and 9);--> statement-breakpoint
-- A card kept back moves its owner's data stamp, so a reader whose cached page keys on `friendGeneration` misses when a
-- friend keeps a card back or lets it go.
DROP TRIGGER IF EXISTS user_data_touch ON "spare_keep";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "spare_keep"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
