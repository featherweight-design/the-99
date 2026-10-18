CREATE TABLE "payment_disputes" (
	"dispute_id" text PRIMARY KEY NOT NULL,
	"payment_intent_id" text NOT NULL,
	"units_revoked" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "payment_disputes_status_check" CHECK ("payment_disputes"."status" in ('open', 'won', 'lost')),
	CONSTRAINT "payment_disputes_units_check" CHECK ("payment_disputes"."units_revoked" >= 0)
);
--> statement-breakpoint
ALTER TABLE "credit_grants" ADD COLUMN "unrecovered_units" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_grants" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_customers" ADD COLUMN "purchase_blocked_at" timestamp;--> statement-breakpoint
CREATE INDEX "payment_disputes_intent_idx" ON "payment_disputes" USING btree ("payment_intent_id");--> statement-breakpoint
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_unrecovered_check" CHECK ("credit_grants"."unrecovered_units" between 0 and "credit_grants"."units");--> statement-breakpoint
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_refunded_check" CHECK ("credit_grants"."refunded_cents" >= 0);