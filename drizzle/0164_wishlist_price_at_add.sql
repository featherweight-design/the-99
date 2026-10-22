ALTER TABLE "wishlist_items" ADD COLUMN "price_at_add_cents" integer;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "price_noticed_at" timestamp with time zone;