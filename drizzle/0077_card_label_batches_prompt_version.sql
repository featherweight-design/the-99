ALTER TABLE "card_label_batches" ADD COLUMN "prompt_version" text;--> statement-breakpoint
ALTER TABLE "card_label_batches" ADD COLUMN "asked_hashes" jsonb;