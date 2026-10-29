ALTER TABLE "deck_suggestion_runs" ADD COLUMN "read_list_fingerprint" text;--> statement-breakpoint
ALTER TABLE "deck_suggestion_runs" ADD COLUMN "read_list_card_ids" uuid[];