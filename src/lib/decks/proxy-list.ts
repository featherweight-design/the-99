import { sql } from "drizzle-orm";
import { db } from "../../db";

/**
 * One printed card, and every deck printing it.
 *
 * Grouped by CARD rather than by deck, because the two questions this page
 * exists for are both per card: what to send to a print shop, and what owning
 * them for real would cost. A deck-grouped list answers neither without the
 * reader doing the folding.
 *
 * Membership-scoped like every other proxy read — a row whose card has left its
 * deck names nothing here. `pruneOrphanProxies` means one should not exist; this
 * is the reading half of that pair.
 */
export type ProxyRow = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  cmc: number;
  imageUri: string | null;
  setCode: string | null;
  rarity: string | null;
  /** The decks printing it, newest mark first. */
  decks: { id: string; name: string }[];
  /** This card is a commander of at least one deck printing it — ruling 3's case,
   *  otherwise invisible in a list where every row looks like a list card. */
  commander: boolean;
  /** Cents for one copy, or null where the feed has never stocked it. NOT zero:
   *  a card nobody is selling is not a free card. */
  priceCents: number | null;
};

export async function loadProxyList(userId: string): Promise<ProxyRow[]> {
  const { rows } = await db.execute<{
    oracle_id: string;
    name: string;
    type_line: string;
    mana_cost: string | null;
    cmc: number;
    image_uri: string | null;
    set_code: string | null;
    rarity: string | null;
    decks: { id: string; name: string }[];
    commander: boolean;
    price_cents: number | null;
  }>(sql`
    with held as (
      -- Every LIVE proxy: a mark whose card the deck still holds, by the same
      -- membership test the write validates against.
      select p.oracle_id, p.deck_id, p.created_at,
             (d.commander_oracle_id = p.oracle_id or d.partner_oracle_id = p.oracle_id) as is_commander,
             d.name as deck_name
      from deck_proxies p
      join decks d on d.id = p.deck_id
      where d.user_id = ${userId}
        and (
          exists (
            select 1 from deck_cards dc
            where dc.deck_id = p.deck_id and dc.oracle_id = p.oracle_id
          )
          or d.commander_oracle_id = p.oracle_id
          or d.partner_oracle_id = p.oracle_id
        )
    ),
    -- The newest price row per card, which is what the strip totals. A card the
    -- feed has never carried has no row and stays null all the way out.
    priced as (
      select distinct on (pr.oracle_id) pr.oracle_id, pr.price_cents
      from printing_prices pp
      join printings pr on pr.scryfall_id = pp.scryfall_id
      where pp.price_cents is not null
      order by pr.oracle_id, pp.as_of desc, pp.price_cents asc
    )
    select
      h.oracle_id,
      c.name,
      c.type_line,
      c.mana_cost,
      c.cmc,
      c.image_uri,
      min(pr.set_code) as set_code,
      min(pr.rarity) as rarity,
      jsonb_agg(
        jsonb_build_object('id', h.deck_id, 'name', h.deck_name)
        order by h.created_at desc, h.deck_id
      ) as decks,
      bool_or(h.is_commander) as commander,
      min(priced.price_cents)::int as price_cents,
      -- Newest MARK first, which created_at is the only record of.
      max(h.created_at) as newest
    from held h
    join cards c on c.oracle_id = h.oracle_id
    left join printings pr on pr.oracle_id = h.oracle_id
    left join priced on priced.oracle_id = h.oracle_id
    group by h.oracle_id, c.name, c.type_line, c.mana_cost, c.cmc, c.image_uri
    order by newest desc, c.name
  `);

  return rows.map((r) => ({
    oracleId: r.oracle_id,
    name: r.name,
    typeLine: r.type_line,
    manaCost: r.mana_cost,
    cmc: r.cmc,
    imageUri: r.image_uri,
    setCode: r.set_code,
    rarity: r.rarity,
    decks: r.decks ?? [],
    commander: r.commander,
    priceCents: r.price_cents,
  }));
}
