CREATE TABLE "feed_dismissals" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_dismissals_user_id_key_pk" PRIMARY KEY("user_id","key"),
	CONSTRAINT "feed_dismissals_key_check" CHECK ("feed_dismissals"."key" ~ '^(item:[0-9a-f-]{36}|set:.+|precon:.+)$')
);
