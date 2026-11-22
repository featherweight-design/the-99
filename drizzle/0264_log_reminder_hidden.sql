CREATE TABLE "rule_zero_log_hidden" (
	"user_id" text NOT NULL,
	"table_id" uuid NOT NULL,
	"game_ms" bigint NOT NULL,
	"hidden_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_zero_log_hidden_user_id_table_id_game_ms_pk" PRIMARY KEY("user_id","table_id","game_ms")
);
--> statement-breakpoint
ALTER TABLE "rule_zero_log_hidden" ADD CONSTRAINT "rule_zero_log_hidden_table_id_rule_zero_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."rule_zero_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rule_zero_log_hidden_table_idx" ON "rule_zero_log_hidden" USING btree ("table_id");