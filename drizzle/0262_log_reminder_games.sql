ALTER TABLE "rule_zero_result_seats" DROP CONSTRAINT "rule_zero_result_seats_seat_unique";--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" DROP CONSTRAINT "rule_zero_result_seats_table_id_user_id_pk";--> statement-breakpoint
UPDATE "rule_zero_result_seats" SET "started_at" = "saved_at" WHERE "started_at" IS NULL;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ALTER COLUMN "started_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ADD CONSTRAINT "rule_zero_result_seats_table_id_started_at_user_id_pk" PRIMARY KEY("table_id","started_at","user_id");--> statement-breakpoint
ALTER TABLE "deck_games" ADD COLUMN "rule_zero_game_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ADD CONSTRAINT "rule_zero_result_seats_seat_unique" UNIQUE("table_id","started_at","seat");