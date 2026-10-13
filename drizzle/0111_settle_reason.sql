ALTER TABLE "intake_reads" ADD COLUMN "settled_at" timestamp;--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "refund_reason" text;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_refund_reason_check" CHECK ("model_calls"."refund_reason" is null or "model_calls"."refund_reason" in ('failed', 'nothing_valid', 'late_success', 'reaped'));--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_refund_reason_status_check" CHECK ("model_calls"."refund_reason" is null or "model_calls"."status" = 'refunded');