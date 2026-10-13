CREATE TABLE "owned_support_counts" (
	"user_id" text NOT NULL,
	"commander_oracle_id" uuid NOT NULL,
	"owned_support" integer NOT NULL,
	CONSTRAINT "owned_support_counts_user_id_commander_oracle_id_pk" PRIMARY KEY("user_id","commander_oracle_id")
);
--> statement-breakpoint
CREATE TABLE "owned_support_stamps" (
	"user_id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"support_millis" bigint,
	"catalog_millis" bigint,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
