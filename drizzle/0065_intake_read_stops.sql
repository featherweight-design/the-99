CREATE TABLE "intake_read_stops" (
	"read_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intake_read_stops_user_id_read_id_pk" PRIMARY KEY("user_id","read_id")
);
--> statement-breakpoint
CREATE INDEX "intake_read_stops_user_created_idx" ON "intake_read_stops" USING btree ("user_id","created_at");