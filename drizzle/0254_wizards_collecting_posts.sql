CREATE TABLE "wizards_collecting_posts" (
	"url" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"lastmod" text,
	"deck_names" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_fetched_at" timestamp with time zone NOT NULL
);
