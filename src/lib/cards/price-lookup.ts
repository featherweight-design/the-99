// Prices for one card's printings, keyed by printing — the pure half.
//
// The deck-side reader (`lib/decks/price-query.ts`) collapses prices to ONE
// chosen printing per oracle card, because a decklist row is an oracle card. The
// card-detail modal is the opposite question: it draws one printing's art at a
// time and the figure under that art has to belong to the printing on screen, so
// this reader keeps every printing's row and lets the caller index into it.
//
// TWO KEYS, BECAUSE A HOLDING MAY NOT NAME AN ID. `collection_items.scryfall_id`
// is nullable — a bare `Name,Qty` import carries neither an id nor a collector
// number — so a `BrowsePrinting` may reach the modal with no `scryfallId`. Where
// it has one, that is the exact question; where it has only a set and a collector
// number, that pair names the same printing. Where it has neither, the caller
// renders nothing: silence is the honest state, because no printing was named to
// ask about. Falling back to the representative printing the way `resolveImageUri`
// does would put a different collector number's figure under this printing's art.
//
// LIVENESS IS NOT FILTERED HERE, for the reason `price-query.ts:34-41` records:
// `priceState` decides it by comparing a row's `as_of` to the newest in the table,
// and a query that returned only live rows would make `soldOut` unreachable.

import { parseAsOf, type PriceFact } from "../decks/price";

type Timestamp = string | Date;

/** One `printings` row joined to its price, plus the table-wide newest `as_of`. */
export type PrintingPriceRow = {
  newest_as_of: Timestamp | null;
  scryfall_id: string | null;
  set_code: string | null;
  collector_number: string | null;
  price_cents: number | null;
  price_cents_foil: number | null;
  price_cents_etched: number | null;
  as_of: Timestamp | null;
};

export type PrintingPrices = {
  /** By `printings.scryfall_id` — the exact question, where the printing names an id. */
  byScryfallId: Record<string, PriceFact>;
  /** By `SETCODE|collectorNumber`, uppercased set — the same printing, named the other way. */
  byPrintingKey: Record<string, PriceFact>;
  /** The newest `as_of` in the WHOLE table, which is what liveness is measured against. */
  newestAsOf: Date | null;
};

/** `BrowsePrinting`'s own key shape, so both sides of the lookup agree. */
export function priceKeyFor(p: { setCode: string; collectorNumber: string }): string {
  return `${p.setCode.toUpperCase()}|${p.collectorNumber}`;
}

/**
 * The pure half: rows in, two indexes out. A row with no price columns at all is
 * dropped rather than stored as a zeroed fact — absence is what the caller reads
 * as "the feed has never carried this printing", and a fact of nulls would be
 * indistinguishable from a live row with no non-foil stock.
 */
export function indexPriceRows(rows: PrintingPriceRow[]): PrintingPrices {
  const byScryfallId: Record<string, PriceFact> = {};
  const byPrintingKey: Record<string, PriceFact> = {};
  let newestAsOf: Date | null = null;

  for (const r of rows) {
    if (newestAsOf === null && r.newest_as_of !== null) {
      newestAsOf = parseAsOf(r.newest_as_of);
    }
    if (r.as_of === null) continue;
    const fact: PriceFact = {
      cents: r.price_cents,
      foilCents: r.price_cents_foil,
      etchedCents: r.price_cents_etched,
      asOf: parseAsOf(r.as_of),
    };
    if (r.scryfall_id !== null) byScryfallId[r.scryfall_id] = fact;
    if (r.set_code !== null && r.collector_number !== null) {
      byPrintingKey[priceKeyFor({ setCode: r.set_code, collectorNumber: r.collector_number })] = fact;
    }
  }

  return { byScryfallId, byPrintingKey, newestAsOf };
}

/**
 * The figure for the printing on screen, or `null` for "draw nothing".
 *
 * The three answers are different claims and the caller must not collapse them:
 *
 *   null                  draw nothing. Either no read reached us, or the printing
 *                         names neither an id nor a collector number, so there was
 *                         nothing to ask the store about.
 *   { fact: PriceFact }   the feed carried this printing. `priceState` decides
 *                         whether that is a figure, a foil-only figure or sold out.
 *   { fact: null }        the read succeeded and this printing is not in it. The
 *                         store answered and the answer was no.
 *
 * It NEVER falls back to another printing's figure — not the card's cheapest, not
 * the set's representative. A figure under this art must belong to this art.
 */
export function priceFor(
  prices: PrintingPrices | null | undefined,
  printing: { scryfallId?: string; setCode: string; collectorNumber: string } | undefined,
): { fact: PriceFact | null } | null {
  if (!prices || !printing) return null;
  if (printing.scryfallId) {
    return { fact: prices.byScryfallId[printing.scryfallId] ?? null };
  }
  // A holding with no catalog id — a bare `Name,Qty` import — is still nameable
  // when it carries BOTH halves of a printing's identity. One half is not an
  // identity: a collector number with no set code would fall through to a `|263`
  // key, miss, and report that the store had answered about a printing nobody
  // named.
  if (printing.setCode === "" || printing.collectorNumber === "") return null;
  // The figure follows the printing the ENTRY names, which is not always the
  // printing whose art is drawn: where the exact row carries no image,
  // `resolveImageUri` falls back to the set's representative. The entry is still
  // this printing, the player still owns this printing, and its price is still
  // the true one — the stand-in art is a documented approximation of the picture,
  // never a change of which printing is in hand.
  return { fact: prices.byPrintingKey[priceKeyFor(printing)] ?? null };
}
