ALTER TABLE "admin_events" DROP CONSTRAINT "admin_events_kind_check";--> statement-breakpoint
ALTER TABLE "admin_events" DROP CONSTRAINT "admin_events_fields_check";--> statement-breakpoint
ALTER TABLE "admin_events" ADD CONSTRAINT "admin_events_kind_check" CHECK ("admin_events"."kind" in ('override_set', 'override_cleared', 'group_created', 'group_renamed', 'group_described', 'member_added', 'member_removed', 'setting_set', 'group_allowance_set'));--> statement-breakpoint
ALTER TABLE "admin_events" ADD CONSTRAINT "admin_events_fields_check" CHECK (case "admin_events"."kind"
    when 'override_set' then "admin_events"."switch" is not null and "admin_events"."scope" is not null and "admin_events"."new_value" is not null
    when 'override_cleared' then "admin_events"."switch" is not null and "admin_events"."scope" is not null and "admin_events"."old_value" is not null
    when 'group_created' then "admin_events"."group_id" is not null and "admin_events"."new_value" is not null
    when 'group_renamed' then "admin_events"."group_id" is not null and "admin_events"."old_value" is not null and "admin_events"."new_value" is not null
    when 'group_described' then "admin_events"."group_id" is not null and ("admin_events"."old_value" is not null or "admin_events"."new_value" is not null)
    when 'member_added' then "admin_events"."group_id" is not null and "admin_events"."user_id" is not null
    when 'member_removed' then "admin_events"."group_id" is not null and "admin_events"."user_id" is not null
    when 'setting_set' then "admin_events"."setting_key" is not null and "admin_events"."setting_month" is not null and "admin_events"."new_value" is not null
    when 'group_allowance_set' then "admin_events"."group_id" is not null and ("admin_events"."old_value" is not null or "admin_events"."new_value" is not null)
  end);