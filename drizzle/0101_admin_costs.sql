CREATE TABLE "admin_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"actor_id" text NOT NULL,
	"kind" text NOT NULL,
	"switch" text,
	"scope" text,
	"group_id" uuid,
	"user_id" text,
	"setting_key" text,
	"old_value" text,
	"new_value" text,
	"note" text,
	CONSTRAINT "admin_events_kind_check" CHECK ("admin_events"."kind" in ('override_set', 'override_cleared', 'group_created', 'group_renamed', 'group_described', 'member_added', 'member_removed', 'setting_set')),
	CONSTRAINT "admin_events_scope_check" CHECK ("admin_events"."scope" is null or "admin_events"."scope" in ('app', 'group', 'user')),
	CONSTRAINT "admin_events_fields_check" CHECK (case "admin_events"."kind"
    when 'override_set' then "admin_events"."switch" is not null and "admin_events"."scope" is not null and "admin_events"."new_value" is not null
    when 'override_cleared' then "admin_events"."switch" is not null and "admin_events"."scope" is not null and "admin_events"."old_value" is not null
    when 'group_created' then "admin_events"."group_id" is not null and "admin_events"."new_value" is not null
    when 'group_renamed' then "admin_events"."group_id" is not null and "admin_events"."old_value" is not null and "admin_events"."new_value" is not null
    when 'group_described' then "admin_events"."group_id" is not null
    when 'member_added' then "admin_events"."group_id" is not null and "admin_events"."user_id" is not null
    when 'member_removed' then "admin_events"."group_id" is not null and "admin_events"."user_id" is not null
    when 'setting_set' then "admin_events"."setting_key" is not null and "admin_events"."new_value" is not null
  end),
	CONSTRAINT "admin_events_scope_target_check" CHECK ("admin_events"."scope" is null
    or ("admin_events"."scope" = 'app' and "admin_events"."group_id" is null and "admin_events"."user_id" is null)
    or ("admin_events"."scope" = 'group' and "admin_events"."group_id" is not null and "admin_events"."user_id" is null)
    or ("admin_events"."scope" = 'user' and "admin_events"."user_id" is not null and "admin_events"."group_id" is null))
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value_micro_usd" bigint NOT NULL,
	"as_of" date NOT NULL,
	"note" text,
	"updated_by" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_settings_key_check" CHECK ("admin_settings"."key" in ('account_cap_usd', 'system_ceiling_usd', 'elsewhere_usd')),
	CONSTRAINT "admin_settings_value_check" CHECK ("admin_settings"."value_micro_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "model_call_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"step" text NOT NULL,
	"model" text NOT NULL,
	"effort" text,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer NOT NULL,
	"cache_write_tokens" integer NOT NULL,
	"cost_micro_usd" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_call_parts_effort_check" CHECK ("model_call_parts"."effort" is null or "model_call_parts"."effort" in ('low', 'medium', 'high'))
);
--> statement-breakpoint
ALTER TABLE "model_call_parts" ADD CONSTRAINT "model_call_parts_call_id_model_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."model_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_events_at_idx" ON "admin_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "model_call_parts_call_idx" ON "model_call_parts" USING btree ("call_id");