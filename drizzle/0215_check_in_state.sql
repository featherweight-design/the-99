CREATE TABLE "check_in_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"visit_days" integer DEFAULT 0 NOT NULL,
	"last_visit_day" date,
	"snoozes" integer DEFAULT 0 NOT NULL,
	"snoozed_until" timestamp,
	"ended_at" timestamp,
	"shown_at" timestamp
);
