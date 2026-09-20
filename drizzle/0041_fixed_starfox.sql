CREATE TABLE "card_bracket_flags" (
	"oracle_id" uuid PRIMARY KEY NOT NULL,
	"mass_land_denial" boolean DEFAULT false NOT NULL,
	"mass_land_denial_sources" text[] DEFAULT '{}' NOT NULL,
	"extra_turn" boolean DEFAULT false NOT NULL,
	"extra_turn_sources" text[] DEFAULT '{}' NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_bracket_flags_mld_sources_check" CHECK ("card_bracket_flags"."mass_land_denial" = (cardinality("card_bracket_flags"."mass_land_denial_sources") > 0)),
	CONSTRAINT "card_bracket_flags_et_sources_check" CHECK ("card_bracket_flags"."extra_turn" = (cardinality("card_bracket_flags"."extra_turn_sources") > 0)),
	CONSTRAINT "card_bracket_flags_source_values_check" CHECK ("card_bracket_flags"."mass_land_denial_sources" <@ array['spellbook_sweep', 'oracle_rule']::text[]
        and "card_bracket_flags"."extra_turn_sources" <@ array['spellbook_sweep', 'oracle_rule']::text[])
);
--> statement-breakpoint
CREATE TABLE "spellbook_variant_cards" (
	"variant_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"must_be_commander" boolean DEFAULT false NOT NULL,
	CONSTRAINT "spellbook_variant_cards_variant_id_oracle_id_pk" PRIMARY KEY("variant_id","oracle_id")
);
--> statement-breakpoint
CREATE TABLE "spellbook_variants" (
	"variant_id" text PRIMARY KEY NOT NULL,
	"bracket_tag" text NOT NULL,
	"card_count" integer NOT NULL,
	"identity" text NOT NULL,
	"popularity" integer,
	"produces" text[] NOT NULL,
	"requires_template_ids" integer[] NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "spellbook_variants_bracket_tag_check" CHECK ("spellbook_variants"."bracket_tag" in ('R', 'S', 'P', 'O', 'C', 'E', 'B')),
	CONSTRAINT "spellbook_variants_card_count_check" CHECK ("spellbook_variants"."card_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "card_bracket_flags" ADD CONSTRAINT "card_bracket_flags_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spellbook_variant_cards" ADD CONSTRAINT "spellbook_variant_cards_variant_id_spellbook_variants_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."spellbook_variants"("variant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spellbook_variant_cards" ADD CONSTRAINT "spellbook_variant_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spellbook_variant_cards_oracle_idx" ON "spellbook_variant_cards" USING btree ("oracle_id");