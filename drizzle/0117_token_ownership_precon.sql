ALTER TABLE "token_ownership" DROP CONSTRAINT "token_ownership_source_check";--> statement-breakpoint
ALTER TABLE "token_ownership" ADD COLUMN "entry_id" uuid;--> statement-breakpoint
ALTER TABLE "token_ownership" ADD CONSTRAINT "token_ownership_entry_id_collection_history_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."collection_history"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ownership" ADD CONSTRAINT "token_ownership_source_check" CHECK ("token_ownership"."source" in ('upload', 'manual', 'precon'));