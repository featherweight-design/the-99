import { sql } from "drizzle-orm";
import { db } from "../../db";
import { loadPrices } from "./price-query";
import type { PriceFact } from "./price";

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
  /**
   * What the feed last carried for this card, and WHEN — never a bare figure.
   *
   * The whole fact, because the states are not one: a card the feed has never
   * stocked is absent, a card whose newest row predates the table's newest run
   * is sold out, and a foil-only card has a price that is not its non-foil
   * price. A hand-rolled `min(price_cents)` collapsed all three into "no stock"
   * or a confident dollar figure, which is how a frozen last-known price reads
   * as current.
   */
  price: PriceFact | null;
};

export type ProxyList = { rows: ProxyRow[]; newestAsOf: Date | null };

export async function loadProxyList(userId: string): Promise<ProxyList> {
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
      -- COALESCED. bool_or returns NULL when every input is NULL, which is the
      -- normal case for a body-card proxy — and a null would travel out through
      -- a field the type says is boolean.
      coalesce(bool_or(h.is_commander), false) as commander,
      -- Newest MARK first, which created_at is the only record of.
      max(h.created_at) as newest
    from held h
    join cards c on c.oracle_id = h.oracle_id
    left join printings pr on pr.oracle_id = h.oracle_id
    group by h.oracle_id, c.name, c.type_line, c.mana_cost, c.cmc, c.image_uri
    order by newest desc, c.name
  `);

  // The app's own price read, rather than a second one written here. It carries
  // the liveness and finish rules — live before stale, real non-foil stock
  // before foil-only at any price — that `priceState` then reads to tell
  // `priced` from `soldOut` from `foilOnly` from absent.
  const prices = await loadPrices(rows.map((r) => r.oracle_id));

  return {
    newestAsOf: prices.newestAsOf,
    rows: rows.map((r) => ({
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
    price: prices.prices.get(r.oracle_id) ?? null,
  })),
  };
}

/**
 * Does this player have any deck at all? One boolean, one indexed lookup.
 *
 * Its own query because the alternative — `listDecksWithStats` — is an aggregate
 * that can pull the user-wide claim and seniority scan behind it, every figure
 * of which this page throws away.
 */
export async function userHasDecks(userId: string): Promise<boolean> {
  const { rows } = await db.execute<{ any_deck: boolean }>(sql`
    select exists (select 1 from decks where user_id = ${userId}) as any_deck
  `);
  return rows[0]?.any_deck ?? false;
}
