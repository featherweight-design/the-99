CREATE TABLE "scan_lab_spike" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"result_id" uuid,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan_lab_spike" ADD CONSTRAINT "scan_lab_spike_result_id_scan_lab_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."scan_lab_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scan_lab_spike_user_idx" ON "scan_lab_spike" USING btree ("user_id","created_at");