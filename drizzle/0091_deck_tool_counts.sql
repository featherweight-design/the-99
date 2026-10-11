CREATE TABLE "deck_tool_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"tool" text NOT NULL,
	"list_fingerprint" text NOT NULL,
	"read_version" integer,
	"summary" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_tool_counts_deck_tool_fingerprint_key" UNIQUE("deck_id","tool","list_fingerprint"),
	CONSTRAINT "deck_tool_counts_tool_check" CHECK ("deck_tool_counts"."tool" in ('proposed_cuts', 'mana_balance'))
);
--> statement-breakpoint
ALTER TABLE "deck_tool_counts" ADD CONSTRAINT "deck_tool_counts_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_tool_counts_deck_created_idx" ON "deck_tool_counts" USING btree ("deck_id","created_at");