export type PriceRow = {
  scryfallId: string;
  priceCents: number | null;
  priceCentsNm: number | null;
  priceCentsFoil: number | null;
  priceCentsEtched: number | null;
  availableQuantity: number;
  buyUrl: string | null;
  asOf: Date;
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

// Number.isFinite, not typeof: a JSON null is typeof "object" but a JSON NaN
// would pass a typeof check while being unusable as an integer column value.
const intOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/**
 * Chooses which of several entries sharing one `scryfall_id` survives.
 *
 * The feed lists the same printing under different product forms — the single
 * card and a card-plus-token bundle, for instance — so an ingest that keys on
 * `scryfall_id` must pick one. Prefer a priced entry, then the lowest price,
 * then the deepest stock. On the Adorned Pouncer pair this selects the 34c
 * single over the 55c bundle, which is the answer a "what does this cost to
 * buy" feature wants.
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
    if (scryfallId === null) continue;
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
    };

    const existing = byId.get(scryfallId);
    if (existing === undefined) { byId.set(scryfallId, row); continue; }
    collapsedDuplicates++;
    byId.set(scryfallId, preferred(existing, row));
  }

  return { asOf, rows: [...byId.values()], collapsedDuplicates };
}
