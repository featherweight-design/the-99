CREATE TABLE "catalog_sources" (
	"source" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp NOT NULL,
	"sha256" text NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_sources_source_check" CHECK ("catalog_sources"."source" in ('sets', 'oracle_cards', 'default_cards', 'prices'))
);
