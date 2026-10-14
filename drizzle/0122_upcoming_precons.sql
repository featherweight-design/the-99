CREATE TABLE "catalog_first_seen" (
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"first_seen_at" timestamp NOT NULL,
	"baseline" boolean NOT NULL,
	CONSTRAINT "catalog_first_seen_kind_key_pk" PRIMARY KEY("kind","key"),
	CONSTRAINT "catalog_first_seen_kind_check" CHECK ("catalog_first_seen"."kind" in ('set', 'precon'))
);
--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN "upcoming_seen_codes" text[] DEFAULT '{}'::text[] NOT NULL;