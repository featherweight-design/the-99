ALTER TABLE "payment_records" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_refunded_check" CHECK ("payment_records"."refunded_cents" >= 0);--> statement-breakpoint
-- Backfill: a refund already stored on its lot (matched by the object that paid for it) is copied up before any purge can drop the lot.
UPDATE "payment_records" p SET "refunded_cents" = g."refunded_cents" FROM "credit_grants" g WHERE g."external_id" = p."checkout_session_id" AND g."refunded_cents" > 0;