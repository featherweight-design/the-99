-- Store preference PR 3a (design #3200): `wishlist_items.price_store`, the store a line's price-drop baseline was read
-- from (null is Mana Pool, every existing baseline), and the switch STORE_PREFERENCE_ENABLED in flag_overrides_switch_check.
-- REVERSAL, in this order: ALTER TABLE "wishlist_items" DROP COLUMN "price_store" (drops its check too);
-- DELETE FROM "flag_overrides" WHERE "switch" = 'STORE_PREFERENCE_ENABLED'; then drop and re-add flag_overrides_switch_check
-- with the list the constraint holds at that time, less 'STORE_PREFERENCE_ENABLED' (read it from the schema).
ALTER TABLE "flag_overrides" DROP CONSTRAINT "flag_overrides_switch_check";--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "price_store" text;--> statement-breakpoint
ALTER TABLE "flag_overrides" ADD CONSTRAINT "flag_overrides_switch_check" CHECK ("flag_overrides"."switch" in ('ANNOUNCEMENTS_ENABLED', 'FEEDBACK_ENABLED', 'FLYER_TRIAL_ENABLED', 'FRIEND_LINKS_ENABLED', 'LIST_CACHE_ENABLED', 'MODEL_CALLS_ENABLED', 'PAYMENTS_ENABLED', 'PRECON_UPGRADE_ENABLED', 'PUSH_ENABLED', 'PUBLIC_LANDING_ENABLED', 'PUBLIC_PAGES_ENABLED', 'SCAN_LAB_ENABLED', 'STORE_PREFERENCE_ENABLED', 'SUGGESTED_CHANGES_V2_ENABLED', 'WELCOME_CREDITS_ENABLED', 'ALL_FEATURES'));--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_price_store_check" CHECK ("wishlist_items"."price_store" in ('manapool', 'tcgplayer', 'cardkingdom'));