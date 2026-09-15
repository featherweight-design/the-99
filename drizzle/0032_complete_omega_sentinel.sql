CREATE TABLE "card_assignments" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"deck_id" uuid NOT NULL,
	"copies" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_assignments_user_id_oracle_id_deck_id_pk" PRIMARY KEY("user_id","oracle_id","deck_id"),
	CONSTRAINT "card_assignments_copies_positive" CHECK ("card_assignments"."copies" > 0)
);
--> statement-breakpoint
ALTER TABLE "card_assignments" ADD CONSTRAINT "card_assignments_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_assignments" ADD CONSTRAINT "card_assignments_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_assignments_deck_idx" ON "card_assignments" USING btree ("deck_id");