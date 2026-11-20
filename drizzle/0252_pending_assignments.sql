-- A copy a player chose to give a committed deck that does not list the card yet (Move a copy, #2980): waits here, never counted as a claim, and becomes a reservation only when that deck commits a version listing the card. New table only, no backfill.
CREATE TABLE "pending_assignments" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"deck_id" uuid NOT NULL,
	"copies" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_assignments_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id"),
	CONSTRAINT "pending_assignments_copies_positive" CHECK ("pending_assignments"."copies" > 0)
);
--> statement-breakpoint
ALTER TABLE "pending_assignments" ADD CONSTRAINT "pending_assignments_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_assignments" ADD CONSTRAINT "pending_assignments_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_assignments_deck_idx" ON "pending_assignments" USING btree ("deck_id");