CREATE TABLE "payment_records" (
	"payment_intent_id" text PRIMARY KEY NOT NULL,
	"checkout_session_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"tax_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"country" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_checkout_session_id_unique" UNIQUE("checkout_session_id"),
	CONSTRAINT "payment_records_status_check" CHECK ("payment_records"."status" in ('granted', 'unattributed')),
	CONSTRAINT "payment_records_amounts_check" CHECK ("payment_records"."amount_cents" >= 0 and "payment_records"."tax_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stripe_customers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
