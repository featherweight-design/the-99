-- Printing identity on collection_items (plan §3.3/§3.4, phase 4).
-- Hand-ordered: drizzle-kit cannot express the backfills, and the statement order below is
-- load-bearing — the old primary key references "foil", so it must be dropped before the
-- column is, and both backfills must run while the old data is still readable.
ALTER TABLE "collection_items" ADD COLUMN "scryfall_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_items" ADD COLUMN "collector_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_items" ADD COLUMN "finish" text DEFAULT 'nonfoil' NOT NULL;--> statement-breakpoint
UPDATE "collection_items" SET "finish" = CASE WHEN "foil" THEN 'foil' ELSE 'nonfoil' END;--> statement-breakpoint
-- ManaBox stores set codes raw and UPPERCASE while Scryfall's are lowercase; without this the
-- representative-printing join would match zero pre-existing rows.
UPDATE "collection_items" SET "set_code" = lower("set_code");--> statement-breakpoint
ALTER TABLE "collection_items" DROP CONSTRAINT "collection_items_user_id_oracle_id_set_code_foil_pk";--> statement-breakpoint
ALTER TABLE "collection_items" DROP COLUMN "foil";--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_user_id_oracle_id_set_code_collector_number_finish_pk" PRIMARY KEY("user_id","oracle_id","set_code","collector_number","finish");--> statement-breakpoint
-- A text column with a closed vocabulary drifts without one.
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_finish_check" CHECK ("collection_items"."finish" in ('nonfoil', 'foil', 'etched'));
