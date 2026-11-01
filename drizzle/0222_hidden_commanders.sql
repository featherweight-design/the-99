CREATE TABLE "hidden_commanders" (
	"user_id" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	"hidden_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hidden_commanders_user_id_oracle_id_pk" PRIMARY KEY("user_id","oracle_id")
);
--> statement-breakpoint
ALTER TABLE "hidden_commanders" ADD CONSTRAINT "hidden_commanders_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hidden_commanders_user_hidden_at_idx" ON "hidden_commanders" USING btree ("user_id","hidden_at" DESC NULLS LAST);