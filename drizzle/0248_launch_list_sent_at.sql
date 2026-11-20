ALTER TABLE "launch_list" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "launch_list" ADD COLUMN "unsubscribe_hash" text;--> statement-breakpoint
ALTER TABLE "launch_list" ADD CONSTRAINT "launch_list_unsubscribe_hash_unique" UNIQUE("unsubscribe_hash");