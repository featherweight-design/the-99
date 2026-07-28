CREATE TABLE "sets" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"set_type" text NOT NULL,
	"released_at" date,
	"card_count" integer DEFAULT 0 NOT NULL,
	"digital" boolean DEFAULT false NOT NULL,
	"icon_svg_uri" text
);
