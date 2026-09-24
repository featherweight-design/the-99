ALTER TABLE "model_calls" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "cache_read_tokens" integer;--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "cache_write_tokens" integer;--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "cost_micro_usd" bigint;