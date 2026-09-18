CREATE TABLE "catalog_refreshes" (
	"id" integer PRIMARY KEY NOT NULL,
	"refreshed_at" timestamp DEFAULT now() NOT NULL
);
