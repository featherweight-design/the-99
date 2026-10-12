export type PriceRow = {
  scryfallId: string;
  priceCents: number | null;
  priceCentsNm: number | null;
  priceCentsFoil: number | null;
  priceCentsEtched: number | null;
  availableQuantity: number;
  buyUrl: string | null;
  asOf: Date;
  /**
   * Mana Pool's OWN identity for the product this row prices: its name, set code and collector
   * number as the feed gives them. They are NOT Scryfall's, and for tokens they differ on 42% of
   * priced token printings (1,221 of 2,918 on 2026-10-11): a double-faced token card is listed as
   * `Soldier // Eldrazi`, number `1-17`, under the single token's Scryfall id. A link that names a
   * token must use these, or its line does not match the product the price belongs to. Null when the
   * feed omits them; only the token path reads them.
   */
  productName: string | null;
  productSet: string | null;
  productNumber: string | null;
};

export type ManapoolFeed = {
  asOf: Date;
  rows: PriceRow[];
  collapsedDuplicates: number;
};

// A function, not a shared constant: a module-level object would hand every
// unrecognised payload the same `rows` array and the same Date instance, so one
// mutating caller would poison every other.
const empty = (): ManapoolFeed => ({ asOf: new Date(0), rows: [], collapsedDuplicates: 0 });

// Number.isInteger, not Number.isFinite plus a round: every one of these fields
// is a whole count — cents or copies — so a fractional value means the field
// stopped meaning what it did, and rounding 34.6 to 35 would store a price
// ManaPool never quoted while hiding the drift the canary exists to catch.
// Negatives are refused on the same ground: neither a price nor a stock level
// has a meaningful one. (Number.isInteger also rejects NaN and the infinities.)
const intOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;

// scryfall_id lands in a uuid column, so a malformed id fails the id lookup with
// 22P02 rather than simply not matching — the whole batch dies for one bad row.
// Same guard, same reasoning, as collection/import.ts applies to CSV ids.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/**
 * Chooses which of several entries sharing one `scryfall_id` survives.
 *
 * The feed lists the same printing under different product forms — the single
 * card and a card-plus-token bundle, for instance — so an ingest that keys on
 * `scryfall_id` must pick one. Prefer an entry with a non-foil price, then the
 * lowest of those, then the deepest stock. On the Adorned Pouncer pair this
 * selects the 34c single over the 55c bundle, which is the answer a "what does
 * this cost to buy" feature wants.
 *
 * Only `price_cents` decides — the foil and etched prices ride along on whichever
 * entry wins rather than competing. They price different objects, so a cheap foil
 * is not a reason to prefer an entry whose non-foil price is worse.
 */
function preferred(a: PriceRow, b: PriceRow): PriceRow {
  if (a.priceCents === null && b.priceCents !== null) return b;
  if (b.priceCents === null && a.priceCents !== null) return a;
  if (a.priceCents !== null && b.priceCents !== null) {
    if (b.priceCents < a.priceCents) return b;
    if (a.priceCents < b.priceCents) return a;
  }
  return b.availableQuantity > a.availableQuantity ? b : a;
}

/**
 * Turns ManaPool's `/api/v1/prices/singles` payload into one row per printing.
 *
 * Returns an empty feed rather than throwing on an unrecognised shape: ManaPool
 * documents v1 as "subject to change without notice", and a weekly ingest that
 * crashes on a field rename is harder to diagnose than one that reports zero
 * rows. The contract canary (`pnpm check:manapool`) turns that zero into an alarm.
 */
export function parseManapoolPayload(raw: unknown): ManapoolFeed {
  if (typeof raw !== "object" || raw === null) return empty();
  const payload = raw as { meta?: { as_of?: unknown }; data?: unknown };
  if (!Array.isArray(payload.data)) return empty();

  // An unparseable `as_of` is an unrecognised payload, not a recoverable one:
  // an Invalid Date survives all the way to `as_of timestamp NOT NULL` and to
  // `toISOString()` in the canary, where it throws about a timestamp rather
  // than about the feed. Refuse it here so the alarm names the real cause.
  const asOfRaw = payload.meta?.as_of;
  if (typeof asOfRaw !== "string") return empty();
  const asOf = new Date(asOfRaw);
  if (Number.isNaN(asOf.getTime())) return empty();

  const byId = new Map<string, PriceRow>();
  let collapsedDuplicates = 0;

  for (const entry of payload.data) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const scryfallId = strOrNull(e.scryfall_id);
    if (scryfallId === null || !UUID_RE.test(scryfallId)) continue;
    const availableQuantity = intOrNull(e.available_quantity);
    if (availableQuantity === null) continue;

    const row: PriceRow = {
      scryfallId,
      priceCents: intOrNull(e.price_cents),
      priceCentsNm: intOrNull(e.price_cents_nm),
      priceCentsFoil: intOrNull(e.price_cents_foil),
      priceCentsEtched: intOrNull(e.price_cents_etched),
      availableQuantity,
      buyUrl: strOrNull(e.url),
      asOf,
      productName: strOrNull(e.name),
      productSet: strOrNull(e.set_code),
      // A number, a string or absent: the feed's collector numbers are strings like `1-17`, but a
      // plain one could arrive as a JSON number, and `String` keeps both the same.
      productNumber: typeof e.number === "number" ? String(e.number) : strOrNull(e.number),
    };

    const existing = byId.get(scryfallId);
    if (existing === undefined) { byId.set(scryfallId, row); continue; }
    collapsedDuplicates++;
    byId.set(scryfallId, preferred(existing, row));
  }

  return { asOf, rows: [...byId.values()], collapsedDuplicates };
}
