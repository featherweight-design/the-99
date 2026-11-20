CREATE TABLE "rule_zero_result_seats" (
	"table_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"seat" smallint NOT NULL,
	"place" smallint NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_zero_result_seats_table_id_user_id_pk" PRIMARY KEY("table_id","user_id"),
	CONSTRAINT "rule_zero_result_seats_seat_unique" UNIQUE("table_id","seat"),
	CONSTRAINT "rule_zero_result_seats_seat_check" CHECK ("rule_zero_result_seats"."seat" between 1 and 8),
	CONSTRAINT "rule_zero_result_seats_place_check" CHECK ("rule_zero_result_seats"."place" between 1 and 8)
);
--> statement-breakpoint
ALTER TABLE "deck_games" ADD COLUMN "rule_zero_table_id" uuid;--> statement-breakpoint
ALTER TABLE "rule_zero_result_seats" ADD CONSTRAINT "rule_zero_result_seats_table_id_rule_zero_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."rule_zero_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rule_zero_result_seats_user_idx" ON "rule_zero_result_seats" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "deck_games" ADD CONSTRAINT "deck_games_rule_zero_table_id_rule_zero_tables_id_fk" FOREIGN KEY ("rule_zero_table_id") REFERENCES "public"."rule_zero_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_games_rule_zero_table_idx" ON "deck_games" USING btree ("rule_zero_table_id") WHERE "deck_games"."rule_zero_table_id" is not null;