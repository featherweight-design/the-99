-- Purely additive: one new table and one index; no existing row or table is touched.
-- Down: DROP TABLE "deck_cut_items" (its index and constraints go with it).
CREATE TABLE "deck_cut_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"cut_oracle_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"position" integer NOT NULL,
	"verdict" text DEFAULT 'pending' NOT NULL,
	"verdict_at" timestamp,
	CONSTRAINT "deck_cut_items_verdict_check" CHECK ("deck_cut_items"."verdict" in ('pending', 'accepted', 'dismissed'))
);
--> statement-breakpoint
ALTER TABLE "deck_cut_items" ADD CONSTRAINT "deck_cut_items_run_id_deck_suggestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."deck_suggestion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_cut_items" ADD CONSTRAINT "deck_cut_items_cut_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("cut_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_cut_items_run_position_idx" ON "deck_cut_items" USING btree ("run_id","position");