CREATE TABLE "subscriptions" (
	"stripe_subscription_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_grants" ADD COLUMN "billing_reason" text;--> statement-breakpoint
ALTER TABLE "credit_grants" ADD COLUMN "subscription_id" text;--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_grants_subscription_idx" ON "credit_grants" USING btree ("subscription_id");