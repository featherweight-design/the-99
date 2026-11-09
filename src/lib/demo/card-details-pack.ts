// The landing demo's card details as the committed file holds them (step 5l-c): each card's prices packed, and unpacked on load.
// Its own module, imported by `projected.ts` on the demo's client path, so that path takes none of the exporter's projection.

import type { BrowseCard } from "../collection/browse";
import type { DemoCardDetails } from "./project-cards";

/**
 * A card's `PrintingPrices` as the file holds it. The read keys every catalog printing's price twice (by id and by set and
 * number) and lists every id and key again beside them, so a card with 137 printings took 36 KB, and prices were more than
 * half the card details. Packed, each id and key is written once, each distinct price once, and the maps are index pairs.
 * Nothing is dropped: `unpackPrices` rebuilds the read's object exactly (key order included), because the modal reaches
 * any printing a caller opens it at and every printing of a card the reader does not own.
 */
export type PackedPrices = {
  packed: 1;
  /** `catalogIds`, then any priced id not among them. */
  ids: string[];
  catalogIds: number;
  /** `catalogKeys`, then any priced key not among them. */
  keys: string[];
  catalogKeys: number;
  ambiguousKeys: number[];
  /** Each distinct `asOf`, as ISO text. */
  dates: string[];
  newestAsOf: number | null;
  /** Each distinct price: cents, foil cents, etched cents, its `dates` index. */
  facts: [number | null, number | null, number | null, number][];
  /** `byScryfallId` and `byPrintingKey`, in order, as [ids or keys index, facts index]. */
  byId: [number, number][];
  byKey: [number, number][];
};

type Prices = NonNullable<BrowseCard["prices"]>;

export function packPrices(prices: Prices): PackedPrices {
  const table = <T,>(keyOf: (t: T) => string) => {
    const at = new Map<string, number>();
    const rows: T[] = [];
    return { rows, index: (t: T) => { const k = keyOf(t); let i = at.get(k); if (i === undefined) { i = rows.length; at.set(k, i); rows.push(t); } return i; } };
  };
  const ids = table<string>((s) => s);
  const keys = table<string>((s) => s);
  const dates = table<string>((s) => s);
  const facts = table<PackedPrices["facts"][number]>((f) => f.join(","));
  for (const id of prices.catalogIds) ids.index(id);
  for (const key of prices.catalogKeys) keys.index(key);
  const catalogIds = ids.rows.length;
  const catalogKeys = keys.rows.length;
  const fact = (f: Prices["byScryfallId"][string]) => facts.index([f.cents, f.foilCents, f.etchedCents, dates.index(f.asOf.toISOString())]);
  return {
    packed: 1,
    catalogIds,
    catalogKeys,
    ambiguousKeys: prices.ambiguousKeys.map((k) => keys.index(k)),
    newestAsOf: prices.newestAsOf === null ? null : dates.index(prices.newestAsOf.toISOString()),
    byId: Object.entries(prices.byScryfallId).map(([id, f]) => [ids.index(id), fact(f)]),
    byKey: Object.entries(prices.byPrintingKey).map(([key, f]) => [keys.index(key), fact(f)]),
    ids: ids.rows,
    keys: keys.rows,
    dates: dates.rows,
    facts: facts.rows,
  };
}

export function unpackPrices(p: PackedPrices): Prices {
  const fact = (i: number) => {
    const [cents, foilCents, etchedCents, date] = p.facts[i];
    return { cents, foilCents, etchedCents, asOf: new Date(p.dates[date]) };
  };
  return {
    byScryfallId: Object.fromEntries(p.byId.map(([id, f]) => [p.ids[id], fact(f)])),
    byPrintingKey: Object.fromEntries(p.byKey.map(([key, f]) => [p.keys[key], fact(f)])),
    newestAsOf: p.newestAsOf === null ? null : new Date(p.dates[p.newestAsOf]),
    ambiguousKeys: p.ambiguousKeys.map((k) => p.keys[k]),
    catalogIds: p.ids.slice(0, p.catalogIds),
    catalogKeys: p.keys.slice(0, p.catalogKeys),
  };
}

/** The details as the file holds them: each card's prices packed (`packPrices`). */
export function packCardDetails(details: DemoCardDetails): Record<string, unknown> {
  return Object.fromEntries(Object.entries(details).map(([id, d]) => [id, d.prices ? { ...d, prices: packPrices(d.prices) } : d]));
}

/** The file's details as the modal takes them: the inverse of `packCardDetails`. */
export function unpackCardDetails(file: Record<string, { prices?: unknown }>): DemoCardDetails {
  return Object.fromEntries(Object.entries(file).map(([id, d]) => {
    const prices = d.prices as PackedPrices | Prices | null | undefined;
    return [id, prices && "packed" in prices ? { ...d, prices: unpackPrices(prices) } : d];
  })) as DemoCardDetails;
}
