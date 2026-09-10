CREATE TABLE "deck_version_cards" (
	"version_id" uuid NOT NULL,
	"oracle_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"since" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_version_cards_version_id_oracle_id_pk" PRIMARY KEY("version_id","oracle_id")
);
--> statement-breakpoint
CREATE TABLE "deck_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"committed_at" timestamp DEFAULT now() NOT NULL,
	"note" text,
	"commander_oracle_id" uuid NOT NULL,
	"partner_oracle_id" uuid,
	"commander_since" timestamp DEFAULT now() NOT NULL,
	"partner_since" timestamp,
	CONSTRAINT "deck_versions_deck_number_key" UNIQUE("deck_id","number")
);
--> statement-breakpoint
ALTER TABLE "deck_games" ADD COLUMN "version_id" uuid;--> statement-breakpoint
ALTER TABLE "deck_version_cards" ADD CONSTRAINT "deck_version_cards_version_id_deck_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."deck_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_version_cards" ADD CONSTRAINT "deck_version_cards_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_commander_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("commander_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_partner_oracle_id_cards_oracle_id_fk" FOREIGN KEY ("partner_oracle_id") REFERENCES "public"."cards"("oracle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_version_cards_oracle_idx" ON "deck_version_cards" USING btree ("oracle_id");--> statement-breakpoint
CREATE INDEX "deck_versions_deck_number_idx" ON "deck_versions" USING btree ("deck_id","number");--> statement-breakpoint
ALTER TABLE "deck_games" ADD CONSTRAINT "deck_games_version_id_deck_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."deck_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Stamp v1 on every deck that is already sleeved.
--
-- ONLY full-body decks. A brew has no version and keeps claiming softly off
-- deck_cards exactly as it does today; stamping one would make a 40-card
-- list's claims hard overnight, which is a behaviour change nobody asked for.
--
-- The body size mirrors deckBodySize() in src/lib/decks/deck-size.ts: 99, or
-- 98 for a deck with a partner. The literal is unavoidable in raw SQL, and a
-- change to the format's total has to touch both.
--
-- committed_at, and every `since` with it, is the deck's created_at rather than
-- now(). Seniority orders on `since`, so stamping every existing deck with one
-- timestamp would leave the tiebreak to the deck_id alone. Using created_at
-- means that on the day this ships, seniority among already-full decks is
-- EXACTLY what it is today — the buy tags that move are only those between a
-- full-body deck and a brew, which is the whole intended change.
insert into deck_versions (
  deck_id, number, committed_at, commander_oracle_id, partner_oracle_id,
  commander_since, partner_since
)
select
  d.id, 1, d.created_at, d.commander_oracle_id, d.partner_oracle_id,
  d.created_at,
  case when d.partner_oracle_id is null then null else d.created_at end
from decks d
left join (
  select deck_id, sum(quantity)::int as cards from deck_cards group by deck_id
) t on t.deck_id = d.id
where coalesce(t.cards, 0) >= (99 - (case when d.partner_oracle_id is null then 0 else 1 end))
on conflict on constraint "deck_versions_deck_number_key" do nothing;--> statement-breakpoint
-- `not exists` rather than a bare `v.number = 1`: this statement must be safe
-- to re-apply after a partially applied migration, and without the guard a
-- second run collides with the (version_id, oracle_id) primary key.
insert into deck_version_cards (version_id, oracle_id, quantity, since)
select v.id, dc.oracle_id, dc.quantity, v.committed_at
from deck_versions v
join deck_cards dc on dc.deck_id = v.deck_id
where v.number = 1
  and not exists (
    select 1 from deck_version_cards c
    where c.version_id = v.id and c.oracle_id = dc.oracle_id
  );