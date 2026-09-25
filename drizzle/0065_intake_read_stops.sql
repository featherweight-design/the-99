CREATE TABLE "intake_read_stops" (
	"read_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "intake_read_stops_user_created_idx" ON "intake_read_stops" USING btree ("user_id","created_at");