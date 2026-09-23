CREATE TABLE "deck_profiles" (
	"deck_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"catalog" text NOT NULL,
	"profile" jsonb NOT NULL,
	"permits" integer[] NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_profiles_permits_check" CHECK (cardinality("deck_profiles"."permits") between 1 and 2 and "deck_profiles"."permits" <@ array[1,2,3,4,5])
);
--> statement-breakpoint
ALTER TABLE "deck_profiles" ADD CONSTRAINT "deck_profiles_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_profiles_user_idx" ON "deck_profiles" USING btree ("user_id");