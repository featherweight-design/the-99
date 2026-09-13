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
  /**
   * Fallback keys that name more than one catalog printing.
   *
   * `printings` is keyed by `scryfall_id` alone and puts no uniqueness on
   * (set_code, collector_number) (`db/schema.ts:65-73`), so two variants can
   * share one — and a single-valued index would keep whichever row the unordered
   * result yielded last. A holding with no id of its own would then be priced
   * from a coin toss between siblings. These keys answer nothing instead.
   */
  ambiguousKeys: string[];
  /**
   * Every printing id the catalog holds for this card, priced or not.
   *
   * A holding's `collection_items.scryfall_id` is not always a PRINTING id: the
   * import falls back to the oracle catalog's own `cards.scryfall_id` when
   * `printings` has not been seeded (`match.ts:59-63`), and that id can be absent
   * from `printings` entirely. Treating such an id as a printing that the feed
   * simply never carried would print `no stock` — a claim about a shop, made
   * about an id the shop was never asked about. So an id the catalog does not
   * know falls through to the (set, collector number) identity instead.
   */
  catalogIds: string[];
  /**
   * Every `(set code, collector number)` key the catalog holds for this card.
   *
   * The counterpart of `catalogIds`, for the same reason: a miss in
   * `byPrintingKey` means "the feed never carried this printing" only when the
   * catalog has that printing to carry. Where it does not — an unseeded catalog, a
   * holding whose pair names no catalog row — nothing was asked, and `no stock`
   * would be a claim about a shop that was never consulted.
   */
  catalogKeys: string[];
  /** The newest `as_of` in the WHOLE table, which is what liveness is measured against. */
  newestAsOf: Date | null;
};

/** `BrowsePrinting`'s own key shape, so both sides of the lookup agree. */
export function priceKeyFor(p: { setCode: string; collectorNumber: string }): string {
  return `${p.setCode.toUpperCase()}|${p.collectorNumber}`;
}

/**
 * The pure half: rows in, indexes out. A row with no `as_of` carried no price row
 * at all — the `left join` produced it — and is indexed as a catalog printing but
 * not as a fact, which is how the caller tells "the feed has never carried this
 * printing" from a figure. A row WITH an `as_of` and all three price columns null
 * is kept as a fact on purpose: that is a live row stocked in neither finish, and
 * `priceState` has a different answer for it.
 */
export function indexPriceRows(rows: PrintingPriceRow[]): PrintingPrices {
  const byScryfallId: Record<string, PriceFact> = {};
  const byPrintingKey: Record<string, PriceFact> = {};
  // Which catalog printings each fallback key names. Counted over every row, not
  // only the priced ones: a key naming two printings of which one is priced is
  // still a key that names two printings.
  const idsPerKey = new Map<string, Set<string>>();
  const catalogIds = new Set<string>();
  const catalogKeys = new Set<string>();
  let newestAsOf: Date | null = null;

  for (const r of rows) {
    if (newestAsOf === null && r.newest_as_of !== null) {
      newestAsOf = parseAsOf(r.newest_as_of);
    }
    if (r.scryfall_id !== null) catalogIds.add(r.scryfall_id);
    if (r.set_code !== null && r.collector_number !== null && r.scryfall_id !== null) {
      const key = priceKeyFor({ setCode: r.set_code, collectorNumber: r.collector_number });
      const ids = idsPerKey.get(key) ?? new Set<string>();
      ids.add(r.scryfall_id);
      idsPerKey.set(key, ids);
      catalogKeys.add(key);
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

  const ambiguousKeys = [...idsPerKey]
    .filter(([, ids]) => ids.size > 1)
    .map(([key]) => key);
  // Dropped rather than left for `priceFor` to step around, so the map never holds
  // a figure that cannot be attributed to one printing.
  for (const key of ambiguousKeys) delete byPrintingKey[key];

  return {
    byScryfallId,
    byPrintingKey,
    newestAsOf,
    ambiguousKeys,
    catalogIds: [...catalogIds],
    catalogKeys: [...catalogKeys],
  };
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
  // An id the catalog knows is the exact question, and a miss against it is a real
  // answer: the feed has never carried this printing. An id the catalog does NOT
  // know is not a printing id at all — see `catalogIds` — so it asks nothing, and
  // the (set, collector number) identity below is asked instead.
  if (printing.scryfallId && prices.catalogIds.includes(printing.scryfallId)) {
    return { fact: prices.byScryfallId[printing.scryfallId] ?? null };
  }
  // A holding with no catalog id — a bare `Name,Qty` import — is still nameable
  // when it carries BOTH halves of a printing's identity. One half is not an
  // identity: a collector number with no set code would fall through to a `|263`
  // key, miss, and report that the store had answered about a printing nobody
  // named.
  // A holding that names a SET but no number still names one printing, whenever the
  // catalog holds only one of this card in that set — and most of them do. Without
  // this the feature is invisible on the commonest import in the app: a Moxfield,
  // Archidekt or paste collection carries neither an id nor a collector number, so
  // every card in it fell to silence while the catalog knew exactly which printing
  // was meant. Row 1.10 is intact — there is no sibling to confuse it with.
  if (printing.collectorNumber === "") {
    const inSet = printing.setCode === ""
      ? prices.catalogKeys
      : prices.catalogKeys.filter((k) => k.startsWith(`${printing.setCode.toUpperCase()}|`));
    // The set narrows it to one, or — for a holding with no set either — the card has
    // only one printing in existence and that is the one it must be.
    if (inSet.length === 1) return { fact: prices.byPrintingKey[inSet[0]] ?? null };
    return null;
  }
  if (printing.setCode === "") return null;
  // A key the catalog gives to two printings names neither of them. Silence, not
  // `no stock`: the store was never asked about a printing this holding can name.
  if (prices.ambiguousKeys.includes(priceKeyFor(printing))) return null;
  // The figure follows the printing the ENTRY names, which is not always the
  // printing whose art is drawn: where the exact row carries no image,
  // `resolveImageUri` falls back to the set's representative. The entry is still
  // this printing, the player still owns this printing, and its price is still
  // the true one — the stand-in art is a documented approximation of the picture,
  // never a change of which printing is in hand.
  const key = priceKeyFor(printing);
  // A key the catalog does not hold was never asked about, so the answer is
  // silence rather than `no stock` — the same distinction `catalogIds` draws one
  // identity up.
  if (!prices.catalogKeys.includes(key)) return null;
  return { fact: prices.byPrintingKey[key] ?? null };
}
