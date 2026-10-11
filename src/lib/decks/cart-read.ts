import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks } from "../../db/schema";
import { allocateClaims } from "./allocate";
import { loadAvailability, loadDeckBuyRows, type DeckBuyRow } from "./availability-query";
import type { CartDeck, CartLine, CartPayload } from "./cart";
import { priceOf, priceState } from "./price";
import { priceFor, type PriceRead } from "./price-query";
import { readBuyRowPrices, rollupBuyRows } from "./shopping-rollup";

/**
 * The all-decks cart's whole read: every row the roll-up bills, the decks they belong to, and
 * each row's price through its own deck's pick (handoff `design_handoff_the99_all_decks_cart`).
 *
 * THE SAME ROWS AND THE SAME PRICES AS THE ROLL-UP, so a deck's figure here is its tile's figure
 * and the lines add up to the decks by construction (audit finding 5): the rows are
 * `loadDeckBuyRows`, the prices are `readBuyRowPrices`, and the per-deck figures are
 * `rollupBuyRows` over both.
 *
 * READ APART, unlike the roll-up (audit finding 8, T2): a price read that fails still leaves the
 * cart its rows, drawn with no figure, and the Mana Pool link still works because it carries names
 * and quantities only. The roll-up reads both in one call and fails whole.
 */
export async function loadCart(userId: string): Promise<CartPayload> {
  const rows = await loadDeckBuyRows(userId);
  if (rows.length === 0) return { decks: [], lines: [], priced: true, newestAsOf: null };

  let read: PriceRead | null = null;
  try {
    read = await readBuyRowPrices(userId, rows);
  } catch (err) {
    console.error("[cart] price read failed; drawing rows without figures", err);
  }

  const deckIds = [...new Set(rows.map((r) => r.deckId))];
  const oracleIds = [...new Set(rows.map((r) => r.oracleId))];
  const [deckRows, cardRows, availability] = await Promise.all([
    cartDecksQuery(userId, deckIds),
    db.select({ oracleId: cards.oracleId, name: cards.name })
      .from(cards)
      .where(inArray(cards.oracleId, oracleIds)),
    // Off any decklist: who holds each owned copy, user-wide. A card owned in no copies has no row.
    loadAvailability(userId, { oracleIds }),
  ]);

  const ownership = new Map<string, Ownership>();
  for (const [oracleId, a] of availability) {
    // What each deck HOLDS: a committed deck its allocation, a brew only what it was given (its
    // soft share is not a held copy), the same reading I got it's receipt takes.
    const heldByDeck = new Map(allocateClaims(a).map((c) => [c.deckId, c.brew ? c.granted : c.allocated]));
    ownership.set(oracleId, { owned: a.owned, heldByDeck });
  }

  return buildCart(rows, read, deckRows, new Map(cardRows.map((c) => [c.oracleId, c.name])), ownership);
}

/** Per card: copies owned, and how many each deck holds. Absent for a card owned in no copies. */
export type Ownership = { owned: number; heldByDeck: Map<string, number> };

/**
 * The cart's decks: name, live commanders, and whether each is a brew (no committed version).
 * Exported so its emitted SQL is asserted (`cart-read.sql.test.ts`): a correlated subquery in a
 * single-table projection is where Drizzle drops the outer table's qualifier (AGENTS.md).
 */
export function cartDecksQuery(userId: string, deckIds: string[]) {
  return db.select({
    id: decks.id,
    name: decks.name,
    commanderOracleId: decks.commanderOracleId,
    partnerOracleId: decks.partnerOracleId,
    // Aliased and qualified: a bare column in this projection would bind to `deck_versions`.
    brew: sql<boolean>`not exists (select 1 from deck_versions dv where dv.deck_id = ${decks}.id)`,
  })
    .from(decks)
    .where(and(eq(decks.userId, userId), inArray(decks.id, deckIds)));
}

type DeckRow = {
  id: string;
  name: string;
  commanderOracleId: string;
  partnerOracleId: string | null;
  brew: boolean;
};

/** The payload from reads already made. Exported for the tests; `loadCart` is the only caller. */
export function buildCart(
  rows: DeckBuyRow[],
  read: PriceRead | null,
  deckRows: DeckRow[],
  cardNames: Map<string, string>,
  ownership: Map<string, Ownership> = new Map(),
): CartPayload {
  const rollup = read ? rollupBuyRows(rows, read) : null;
  const deckById = new Map(deckRows.map((d) => [d.id, d]));

  const decksOut: CartDeck[] = deckRows
    .map((d) => {
      const own = rows.filter((r) => r.deckId === d.id);
      const fig = rollup?.byDeck.get(d.id);
      return {
        id: d.id,
        name: d.name,
        brew: d.brew,
        copies: fig?.copies ?? own.reduce((n, r) => n + r.quantity, 0),
        cents: fig?.cents ?? 0,
        pricedCopies: fig?.pricedCopies ?? 0,
      };
    })
    // Most to buy first, then by name: the order the A2 frame draws the selections in.
    .sort((a, b) => b.copies - a.copies || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const byCard = new Map<string, CartLine>();
  for (const r of rows) {
    const deck = deckById.get(r.deckId);
    if (!deck) continue;
    const line = byCard.get(r.oracleId) ?? {
      oracleId: r.oracleId,
      name: cardNames.get(r.oracleId) ?? "",
      commander: false,
      owned: ownership.get(r.oracleId)?.owned ?? 0,
      heldElsewhere: 0,
      rows: [],
    };
    if (deck.commanderOracleId === r.oracleId || deck.partnerOracleId === r.oracleId) line.commander = true;
    const fact = read ? priceFor(read, r.deckId, r.oracleId) : null;
    const state = read ? priceState(fact, read.newestAsOf) : null;
    line.rows.push({
      deckId: r.deckId,
      quantity: r.quantity,
      cents: fact && state ? priceOf(fact, state) : null,
      state,
    });
    byCard.set(r.oracleId, line);
  }
  // Commanders first, then the cards most decks need, then A to Z (A2).
  const lines = [...byCard.values()]
    .sort((a, b) =>
      Number(b.commander) - Number(a.commander)
      || b.rows.length - a.rows.length
      || a.name.localeCompare(b.name));
  // A line's decks in the selections' order, so `3 · HD - Gishath, HD - Kratos, HD -Thorin` reads
  // in the same order as the list of decks above it.
  const rank = new Map(decksOut.map((d, i) => [d.id, i]));
  for (const l of lines) {
    l.rows.sort((a, b) => (rank.get(a.deckId) ?? 0) - (rank.get(b.deckId) ?? 0));
    const own = ownership.get(l.oracleId);
    if (!own) continue;
    const onLine = new Set(l.rows.map((r) => r.deckId));
    for (const [deckId, held] of own.heldByDeck) if (!onLine.has(deckId)) l.heldElsewhere += held;
  }

  return {
    decks: decksOut,
    lines,
    priced: read !== null,
    newestAsOf: read?.newestAsOf?.toISOString() ?? null,
  };
}
