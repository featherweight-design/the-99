ALTER TABLE "intake_reads" ADD COLUMN "phase" text;--> statement-breakpoint
ALTER TABLE "intake_reads" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "intake_reads" ADD CONSTRAINT "intake_reads_phase_check" CHECK ("intake_reads"."phase" is null or "intake_reads"."phase" in ('shortlist', 'judge'));