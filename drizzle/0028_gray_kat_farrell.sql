ALTER TABLE "printings" ADD COLUMN "booster" boolean;--> statement-breakpoint
ALTER TABLE "printings" ADD COLUMN "rarity" text;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "base_set_size" integer;--> statement-breakpoint
CREATE INDEX "printings_set_code_idx" ON "printings" USING btree ("set_code");