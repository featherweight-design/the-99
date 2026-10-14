CREATE TABLE "account_tombstones" (
	"id_hash" text PRIMARY KEY NOT NULL,
	"clerk_id" text,
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_tombstones_held_idx" ON "account_tombstones" USING btree ("deleted_at") WHERE "account_tombstones"."clerk_id" is not null;