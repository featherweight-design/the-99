ALTER TABLE "deck_synopses" DROP CONSTRAINT "deck_synopses_outcome_check";--> statement-breakpoint
ALTER TABLE "deck_synopses" ADD COLUMN "error_status" integer;--> statement-breakpoint
ALTER TABLE "deck_synopses" ADD CONSTRAINT "deck_synopses_outcome_check" CHECK (("deck_synopses"."status" = 'pending') = ("deck_synopses"."outcome" is null)
        and ("deck_synopses"."outcome" is null or "deck_synopses"."outcome" in ('survived', 'refused', 'malformed', 'upstream_busy', 'upstream_rejected', 'timeout', 'interrupted')));