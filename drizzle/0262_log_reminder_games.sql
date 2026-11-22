ALTER TABLE "rule_zero_result_seats" DROP CONSTRAINT "rule_zero_result_seats_seat_unique";--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" DROP CONSTRAINT "rule_zero_result_seats_table_id_user_id_pk";--> statement-breakpoint
UPDATE "rule_zero_result_seats" SET "started_at" = date_trunc('milliseconds', "saved_at") WHERE "started_at" IS NULL;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ALTER COLUMN "started_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ADD CONSTRAINT "rule_zero_result_seats_table_id_started_at_user_id_pk" PRIMARY KEY("table_id","started_at","user_id");--> statement-breakpoint
ALTER TABLE "deck_games" ADD COLUMN "rule_zero_game_at" timestamp with time zone;--> statement-breakpoint
UPDATE "deck_games" dg SET "rule_zero_game_at" = r.started_at FROM (SELECT "table_id", min("started_at") AS started_at, min("saved_at") AS saved_at FROM "rule_zero_result_seats" GROUP BY "table_id") r WHERE dg."rule_zero_table_id" = r."table_id" AND dg."rule_zero_game_at" IS NULL AND (dg."created_at" AT TIME ZONE 'UTC') >= r.saved_at;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ADD CONSTRAINT "rule_zero_result_seats_seat_unique" UNIQUE("table_id","started_at","seat");