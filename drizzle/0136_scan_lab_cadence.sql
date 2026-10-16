CREATE TABLE "scan_lab_cadence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"index_version" text NOT NULL,
	"frame_count" smallint NOT NULL,
	"frames" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "scan_lab_cadence_user_idx" ON "scan_lab_cadence" USING btree ("user_id","created_at");