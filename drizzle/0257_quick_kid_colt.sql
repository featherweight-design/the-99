ALTER TABLE "rule_zero_result_seats" ADD COLUMN "deck_id" uuid;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ADD CONSTRAINT "rule_zero_result_seats_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rule_zero_result_seats_deck_idx" ON "rule_zero_result_seats" USING btree ("deck_id");