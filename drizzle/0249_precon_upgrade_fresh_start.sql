ALTER TABLE "precon_upgrades" ADD COLUMN "seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "precon_upgrades" ADD COLUMN "unpicked" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- The old flow had no unseen state, so every done run that exists now is treated as seen: none opens by itself after the deploy, even one that landed after the reader's last visit. Failed and pending runs stay null; a failed run is never shown as a result.
UPDATE "precon_upgrades" SET "seen_at" = coalesce("finished_at", "created_at") WHERE "status" = 'done';
