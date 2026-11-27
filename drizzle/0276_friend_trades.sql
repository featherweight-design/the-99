CREATE TABLE "trade_cards" (
	"trade_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"side" text NOT NULL,
	"oracle_id" uuid NOT NULL,
	CONSTRAINT "trade_cards_trade_id_round_side_oracle_id_pk" PRIMARY KEY("trade_id","round","side","oracle_id"),
	CONSTRAINT "trade_cards_side_check" CHECK ("trade_cards"."side" in ('proposer', 'recipient'))
);
--> statement-breakpoint
CREATE TABLE "trade_rounds" (
	"trade_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_rounds_trade_id_round_pk" PRIMARY KEY("trade_id","round"),
	CONSTRAINT "trade_rounds_round_check" CHECK ("trade_rounds"."round" >= 1)
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposer_user_id" text NOT NULL,
	"recipient_user_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"offered_by_user_id" text NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"ended_by_user_id" text,
	"proposer_marked_at" timestamp with time zone,
	"recipient_marked_at" timestamp with time zone,
	"proposer_cleared_at" timestamp with time zone,
	"recipient_cleared_at" timestamp with time zone,
	"from_request_id" uuid,
	CONSTRAINT "trades_status_check" CHECK ("trades"."status" in ('open', 'accepted', 'traded', 'declined', 'withdrawn', 'rescinded', 'expired')),
	CONSTRAINT "trades_not_self_check" CHECK ("trades"."proposer_user_id" <> "trades"."recipient_user_id"),
	CONSTRAINT "trades_offered_by_check" CHECK ("trades"."offered_by_user_id" = case when "trades"."round" % 2 = 1 then "trades"."proposer_user_id" else "trades"."recipient_user_id" end),
	CONSTRAINT "trades_round_check" CHECK ("trades"."round" >= 1),
	CONSTRAINT "trades_ended_by_check" CHECK ("trades"."ended_by_user_id" is null or "trades"."ended_by_user_id" in ("trades"."proposer_user_id", "trades"."recipient_user_id")),
	CONSTRAINT "trades_ended_check" CHECK (("trades"."status" in ('declined', 'withdrawn', 'rescinded')) = ("trades"."ended_at" is not null) and ("trades"."ended_at" is null) = ("trades"."ended_by_user_id" is null)),
	CONSTRAINT "trades_traded_check" CHECK (("trades"."status" = 'traded') = ("trades"."proposer_marked_at" is not null and "trades"."recipient_marked_at" is not null)),
	CONSTRAINT "trades_answered_check" CHECK ("trades"."status" not in ('accepted', 'traded', 'declined') or "trades"."answered_at" is not null),
	CONSTRAINT "trades_marks_check" CHECK (("trades"."proposer_marked_at" is null and "trades"."recipient_marked_at" is null) or "trades"."status" in ('accepted', 'traded', 'rescinded'))
);
--> statement-breakpoint
ALTER TABLE "trade_cards" ADD CONSTRAINT "trade_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_cards" ADD CONSTRAINT "trade_cards_round_fk" FOREIGN KEY ("trade_id","round") REFERENCES "public"."trade_rounds"("trade_id","round") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_rounds" ADD CONSTRAINT "trade_rounds_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_from_request_id_spare_requests_id_fk" FOREIGN KEY ("from_request_id") REFERENCES "public"."spare_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trades_from_request_once" ON "trades" USING btree ("from_request_id") WHERE "trades"."from_request_id" is not null;--> statement-breakpoint
CREATE INDEX "trades_proposer_idx" ON "trades" USING btree ("proposer_user_id","status");--> statement-breakpoint
CREATE INDEX "trades_recipient_idx" ON "trades" USING btree ("recipient_user_id","status");