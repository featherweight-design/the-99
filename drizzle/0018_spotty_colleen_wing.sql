ALTER TABLE "commander_support" ADD COLUMN "prose" text;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "prose_input_hash" text;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "prose_prompt_version" integer;--> statement-breakpoint
ALTER TABLE "commander_support" ADD CONSTRAINT "commander_support_prose_check" CHECK (("commander_support"."prose" is null) = ("commander_support"."prose_input_hash" is null) and ("commander_support"."prose" is null) = ("commander_support"."prose_prompt_version" is null));