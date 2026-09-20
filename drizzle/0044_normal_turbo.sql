ALTER TABLE "commander_pair_support_cards" DROP CONSTRAINT "commander_pair_support_cards_commander_oracle_id_partner_oracle_id_commander_pair_support_commander_oracle_id_partner_oracle_id_fk";
--> statement-breakpoint
ALTER TABLE "commander_pair_support_cards" DROP CONSTRAINT "commander_pair_support_cards_commander_oracle_id_partner_oracle_id_oracle_id_pk";--> statement-breakpoint
ALTER TABLE "commander_pair_support_cards" ADD CONSTRAINT "commander_pair_support_cards_pk" PRIMARY KEY("commander_oracle_id","partner_oracle_id","oracle_id");--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "declared_bracket" integer;--> statement-breakpoint
ALTER TABLE "commander_pair_support_cards" ADD CONSTRAINT "commander_pair_support_cards_pair_fk" FOREIGN KEY ("commander_oracle_id","partner_oracle_id") REFERENCES "public"."commander_pair_support"("commander_oracle_id","partner_oracle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_declared_bracket_range" CHECK ("decks"."declared_bracket" is null or "decks"."declared_bracket" between 1 and 5);