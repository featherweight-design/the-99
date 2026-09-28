CREATE TABLE "catalog_builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"ok" boolean,
	"catalog_fingerprint" text NOT NULL,
	"report" text,
	CONSTRAINT "catalog_builds_kind_check" CHECK ("catalog_builds"."kind" in ('index', 'combos')),
	CONSTRAINT "catalog_builds_finished_check" CHECK (("catalog_builds"."finished_at" is null) = ("catalog_builds"."ok" is null))
);
--> statement-breakpoint
CREATE INDEX "catalog_builds_kind_started_idx" ON "catalog_builds" USING btree ("kind","started_at");