-- Additive: one new table, no existing row touched. Reversal: DROP TABLE "welcome_email_claims";
CREATE TABLE "welcome_email_claims" (
	"email_hash" text PRIMARY KEY NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
