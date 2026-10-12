-- admin_settings is keyed by (key, month): a cap holds from its month until a later month's row,
-- and elsewhere is one month's figure, so a change never rewrites what an earlier month shows.
-- Any row written before this carries the month of its own as_of.
ALTER TABLE "admin_settings" DROP CONSTRAINT "admin_settings_pkey";--> statement-breakpoint
ALTER TABLE "admin_settings" ADD COLUMN "month" text;--> statement-breakpoint
UPDATE "admin_settings" SET "month" = to_char("as_of", 'YYYY-MM');--> statement-breakpoint
ALTER TABLE "admin_settings" ALTER COLUMN "month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_key_month_pk" PRIMARY KEY("key","month");--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_month_check" CHECK ("admin_settings"."month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
