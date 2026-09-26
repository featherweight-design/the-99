CREATE TABLE "pull_releases" (
	"user_id" text NOT NULL,
	"source_deck_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"asking_deck_id" uuid NOT NULL,
	"copies" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_releases_source_deck_id_oracle_id_asking_deck_id_pk" PRIMARY KEY("source_deck_id","oracle_id","asking_deck_id"),
	CONSTRAINT "pull_releases_copies_positive" CHECK ("pull_releases"."copies" > 0)
);
--> statement-breakpoint
ALTER TABLE "pull_releases" ADD CONSTRAINT "pull_releases_source_deck_id_decks_id_fk" FOREIGN KEY ("source_deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_releases" ADD CONSTRAINT "pull_releases_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_releases" ADD CONSTRAINT "pull_releases_asking_deck_id_decks_id_fk" FOREIGN KEY ("asking_deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pull_releases_user_idx" ON "pull_releases" USING btree ("user_id");