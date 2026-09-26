ALTER TABLE "card_label_batches" ADD COLUMN "in_tokens" integer;--> statement-breakpoint
ALTER TABLE "card_label_batches" ADD COLUMN "out_tokens" integer;--> statement-breakpoint
ALTER TABLE "card_label_batches" ADD COLUMN "cache_write_tokens" integer;--> statement-breakpoint
ALTER TABLE "card_label_batches" ADD COLUMN "cache_read_tokens" integer;