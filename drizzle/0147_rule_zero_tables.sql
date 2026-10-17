CREATE TABLE "rule_zero_seats" (
	"table_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"seat" smallint NOT NULL,
	"deck_id" uuid,
	"changed_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_zero_seats_table_id_user_id_pk" PRIMARY KEY("table_id","user_id"),
	CONSTRAINT "rule_zero_seats_seat_unique" UNIQUE("table_id","seat"),
	CONSTRAINT "rule_zero_seats_seat_check" CHECK ("rule_zero_seats"."seat" between 1 and 8)
);
--> statement-breakpoint
CREATE TABLE "rule_zero_seen" (
	"table_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"seen_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "rule_zero_seen_table_id_user_id_pk" PRIMARY KEY("table_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "rule_zero_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pod_id" uuid NOT NULL,
	"set_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rule_zero_seats" ADD CONSTRAINT "rule_zero_seats_table_id_rule_zero_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."rule_zero_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_zero_seats" ADD CONSTRAINT "rule_zero_seats_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_zero_seen" ADD CONSTRAINT "rule_zero_seen_table_id_rule_zero_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."rule_zero_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_zero_tables" ADD CONSTRAINT "rule_zero_tables_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rule_zero_seats_user_idx" ON "rule_zero_seats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rule_zero_seats_deck_idx" ON "rule_zero_seats" USING btree ("deck_id") WHERE "rule_zero_seats"."deck_id" is not null;--> statement-breakpoint
CREATE INDEX "rule_zero_seen_user_idx" ON "rule_zero_seen" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rule_zero_tables_pod_idx" ON "rule_zero_tables" USING btree ("pod_id","expires_at");--> statement-breakpoint
CREATE INDEX "rule_zero_tables_set_by_idx" ON "rule_zero_tables" USING btree ("set_by");