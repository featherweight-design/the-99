-- admin_settings is keyed by (key, month): a cap holds from its month until a later month's row,
-- and elsewhere is one month's figure, so a change never rewrites what an earlier month shows.
-- Any row written before this carries the month of its own as_of.
ALTER TABLE "admin_settings" DROP CONSTRAINT "admin_settings_pkey";--> statement-breakpoint
ALTER TABLE "admin_settings" ADD COLUMN "month" text;--> statement-breakpoint
UPDATE "admin_settings" SET "month" = to_char("as_of", 'YYYY-MM');--> statement-breakpoint
ALTER TABLE "admin_settings" ALTER COLUMN "month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_key_month_pk" PRIMARY KEY("key","month");--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_month_check" CHECK ("admin_settings"."month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
--> statement-breakpoint
ALTER TABLE "admin_events" ADD COLUMN "setting_month" text;--> statement-breakpoint
UPDATE "admin_events" SET "setting_month" = to_char("at", 'YYYY-MM') WHERE "kind" = 'setting_set';--> statement-breakpoint
ALTER TABLE "admin_events" DROP CONSTRAINT "admin_events_fields_check";--> statement-breakpoint
ALTER TABLE "admin_events" ADD CONSTRAINT "admin_events_fields_check" CHECK (case "admin_events"."kind"
    when 'override_set' then "admin_events"."switch" is not null and "admin_events"."scope" is not null and "admin_events"."new_value" is not null
    when 'override_cleared' then "admin_events"."switch" is not null and "admin_events"."scope" is not null and "admin_events"."old_value" is not null
    when 'group_created' then "admin_events"."group_id" is not null and "admin_events"."new_value" is not null
    when 'group_renamed' then "admin_events"."group_id" is not null and "admin_events"."old_value" is not null and "admin_events"."new_value" is not null
    when 'group_described' then "admin_events"."group_id" is not null and ("admin_events"."old_value" is not null or "admin_events"."new_value" is not null)
    when 'member_added' then "admin_events"."group_id" is not null and "admin_events"."user_id" is not null
    when 'member_removed' then "admin_events"."group_id" is not null and "admin_events"."user_id" is not null
    when 'setting_set' then "admin_events"."setting_key" is not null and "admin_events"."setting_month" is not null and "admin_events"."new_value" is not null
  end);--> statement-breakpoint
CREATE INDEX "model_calls_created_idx" ON "model_calls" USING btree ("created_at");