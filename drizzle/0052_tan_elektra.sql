ALTER TABLE "card_bracket_flags" ADD COLUMN "tutor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "card_bracket_flags" ADD COLUMN "tutor_sources" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "card_bracket_flags" ADD CONSTRAINT "card_bracket_flags_tutor_sources_check" CHECK ("card_bracket_flags"."tutor" = (cardinality("card_bracket_flags"."tutor_sources") > 0)
        and "card_bracket_flags"."tutor_sources" <@ array['oracle_rule']::text[]);