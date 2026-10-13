import { sql } from "drizzle-orm";
import { db } from "../../db";
import { loadPrices } from "./price-query";
import type { PriceFact } from "./price";
import { loadOpeningPrintings } from "../cards/opening-printing";
import { resolveOwnedPrintings } from "../collection/owned-printings";

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
    ),
    -- BEFORE any printing join. printings fans out — a card with five
    -- printings repeats its held row five times — and jsonb_agg does not
    -- deduplicate, so aggregating after the join listed each deck once per
    -- printing.
    by_card as (
      select
        h.oracle_id,
        jsonb_agg(
          jsonb_build_object('id', h.deck_id, 'name', h.deck_name)
          order by h.created_at desc, h.deck_id
        ) as decks,
        coalesce(bool_or(h.is_commander), false) as commander,
        max(h.created_at) as newest
      from held h
      group by h.oracle_id
    ),
    -- ONE printing per card, chosen deterministically — and RESTRICTED to the
    -- cards this list holds. Unjoined, the DISTINCT ON sorted every printing in
    -- the catalog before the final join threw all but a handful away, so each
    -- visit paid a global scan of a table with millions of rows.
    --
    -- ONE printing per card, chosen deterministically. Independent min()s over
    -- the fan-out could take the set code from one printing and the rarity from
    -- another and describe a printing that does not exist — the same failure the
    -- price reader documents.
    printing as (
      select distinct on (pr.oracle_id) pr.oracle_id, pr.set_code, pr.rarity
      from printings pr
      join by_card b on b.oracle_id = pr.oracle_id
      left join sets s on s.code = pr.set_code
      -- Through SETS for the date: printings has no released_at of its own, and
      -- the invalid reference typecheck could not see would have 500'd the route.
      -- Newest set first, then the id, so the choice is stable between reads.
      order by pr.oracle_id, s.released_at desc nulls last, pr.scryfall_id
    )
    select
      b.oracle_id,
      c.name,
      c.type_line,
      c.mana_cost,
      c.cmc,
      c.image_uri,
      printing.set_code,
      printing.rarity,
      b.decks,
      b.commander
    from by_card b
    join cards c on c.oracle_id = b.oracle_id
    left join printing on printing.oracle_id = b.oracle_id
    -- Newest MARK first. lower(name) then the oracle id break the tie, because
    -- two same-named cards marked in the same millisecond would otherwise
    -- reorder between reads of unchanged data — and this list exists to show
    -- same-named cards side by side.
    order by b.newest desc, lower(c.name), b.oracle_id
  `);

  // The app's own price read, rather than a second one written here. It carries
  // the liveness and finish rules — live before stale, real non-foil stock
  // before foil-only at any price — that `priceState` then reads to tell
  // `priced` from `soldOut` from `foilOnly` from absent.
  const [prices, ownedArt, opening] = await Promise.all([
    loadPrices(rows.map((r) => r.oracle_id)),
    // The printing the player owns (the one card details opens) where they own one...
    resolveOwnedPrintings(userId, rows.map((r) => r.oracle_id)),
    // ...else the printing card details open an unowned card on, so the art, the set and the rarity are that one's.
    loadOpeningPrintings(rows.map((r) => r.oracle_id)),
  ]);

  return {
    newestAsOf: prices.newestAsOf,
    rows: rows.map((r) => ({
    oracleId: r.oracle_id,
    name: r.name,
    typeLine: r.type_line,
    manaCost: r.mana_cost,
    cmc: r.cmc,
    // Art, set and rarity come from ONE printing: the owned one when the player has it (its rarity is not read, so
    // the line names the set alone), else the one card details open the card on, else the catalog's newest.
    imageUri: ownedArt.get(r.oracle_id)?.imageUri ?? opening.get(r.oracle_id)?.imageUri ?? r.image_uri,
    setCode: ownedArt.get(r.oracle_id)?.setCode ?? opening.get(r.oracle_id)?.setCode ?? r.set_code,
    rarity: ownedArt.has(r.oracle_id) ? null : opening.get(r.oracle_id)?.rarity ?? r.rarity,
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
