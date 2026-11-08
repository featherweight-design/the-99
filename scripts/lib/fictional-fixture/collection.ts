// The fictional collection's rules. PURE: it takes a snapshot of the CATALOG (never any user's collection) and a seeded
// stream, and returns which cards the invented player owns and in which printings. The same snapshot and seed always
// give the same collection, so the account is reproducible on any branch with the same catalog.
import type { Rng } from "./rng";

export type CatalogCard = {
  oracleId: string;
  name: string;
  colors: string[];
  typeLine: string;
  /** How many commanders' lists include it: the catalog's own measure of how widely a card is played. */
  pop: number;
  gameChanger: boolean;
  tutor: boolean;
};
export type CatalogCommander = { oracleId: string; name: string; colors: string[]; support: number };
export type CatalogPrinting = { scryfallId: string; setCode: string; collectorNumber: string; finishes: string[] };
export type CatalogSnapshot = {
  commanders: CatalogCommander[];
  /** Every playable non-basic card with a popularity, most played first (ties by oracle id). */
  cards: CatalogCard[];
  basics: Record<"W" | "U" | "B" | "R" | "G", string>;
};

/** The color pairs the player builds around. Eight of ten pairs: a believable spread, not every corner. */
export const ARCHETYPES = ["WB", "UB", "UR", "BR", "RG", "GW", "GU", "WR"] as const;
export const TARGETS = { rows: 3000, commandersPerArchetype: 5, staples: 160, lands: 130, basicQuantity: 40, foilShare: 0.12 };

const isLand = (c: { typeLine: string }) => c.typeLine.includes("Land");
const within = (colors: string[], archetype: string) => colors.every((x) => archetype.includes(x));

export type OwnedCard = { oracleId: string; quantity: number };
export type OwnedCollection = {
  /** oracle id -> copies owned (basics included). */
  owned: Map<string, number>;
  commanders: CatalogCommander[];
};

/** The cards the player owns. `excluded` ids are never owned (the buy cards a deck is missing). */
export function assembleOwned(catalog: CatalogSnapshot, rng: Rng, excluded: ReadonlySet<string> = new Set()): OwnedCollection {
  const owned = new Map<string, number>();
  const take = (id: string, qty: number) => owned.set(id, (owned.get(id) ?? 0) + qty);
  const quantity = (): number => {
    const r = rng();
    return r < 0.8 ? 1 : r < 0.94 ? 2 : r < 0.985 ? 3 : 4;
  };
  const noisy = <T,>(ranked: T[]): T[] =>
    ranked.map((c, i) => ({ c, k: (i + 1) * (0.6 + 0.8 * rng()) })).sort((a, b) => a.k - b.k).map((x) => x.c);

  // Commanders: five per archetype, the exact pair first then mono-colored, by how many cards their index holds.
  const commanders: CatalogCommander[] = [];
  const taken = new Set<string>();
  for (const arch of ARCHETYPES) {
    const pool = catalog.commanders
      .filter((c) => c.colors.length >= 1 && c.colors.length <= 2 && within(c.colors, arch) && !taken.has(c.oracleId) && !excluded.has(c.oracleId))
      .sort((a, b) => b.colors.length - a.colors.length || b.support - a.support || a.oracleId.localeCompare(b.oracleId));
    for (const c of noisy(pool.slice(0, 24)).slice(0, TARGETS.commandersPerArchetype)) {
      commanders.push(c);
      taken.add(c.oracleId);
      take(c.oracleId, 1);
    }
  }

  const usable = catalog.cards.filter((c) => !excluded.has(c.oracleId) && !taken.has(c.oracleId));
  // Colorless staples: the most played ones, nearly all of them.
  const staples = usable.filter((c) => c.colors.length === 0 && !isLand(c)).slice(0, TARGETS.staples + 40);
  for (const c of noisy(staples).slice(0, TARGETS.staples)) take(c.oracleId, quantity());
  // Lands: the most played ones in the colors the player builds, with the colorless utility lands.
  const lands = usable.filter((c) => isLand(c) && ARCHETYPES.some((a) => within(c.colors, a)));
  for (const c of noisy(lands.slice(0, TARGETS.lands + 60)).slice(0, TARGETS.lands)) take(c.oracleId, quantity());
  for (const id of Object.values(catalog.basics)) take(id, TARGETS.basicQuantity);

  // The rest: round-robin over the archetypes, each walking its own noisy popularity order, until the target.
  const lanes = ARCHETYPES.map((arch) =>
    noisy(usable.filter((c) => c.colors.length > 0 && !isLand(c) && within(c.colors, arch)).slice(0, 2600)),
  );
  const cursor = lanes.map(() => 0);
  let spent = true;
  while (owned.size < TARGETS.rows && spent) {
    spent = false;
    for (const [i, lane] of lanes.entries()) {
      while (cursor[i] < lane.length && owned.has(lane[cursor[i]].oracleId)) cursor[i] += 1;
      if (cursor[i] >= lane.length || owned.size >= TARGETS.rows) continue;
      take(lane[cursor[i]].oracleId, quantity());
      cursor[i] += 1;
      spent = true;
    }
  }
  if (owned.size < TARGETS.rows) throw new Error(`the catalog offered ${owned.size} cards, not ${TARGETS.rows}`);
  return { owned, commanders };
}

export type OwnedRow = {
  oracleId: string;
  setCode: string;
  collectorNumber: string;
  scryfallId: string;
  finish: "nonfoil" | "foil";
  condition: "near_mint" | "mint";
  quantity: number;
};

/**
 * Real printings for the owned cards, a fixed share of them foil. A holding of two or more copies splits into two
 * printings now and then, as a binder does. `printingsOf` holds each card's printings, representative first.
 */
export function assignPrintings(
  owned: ReadonlyMap<string, number>,
  printingsOf: ReadonlyMap<string, CatalogPrinting[]>,
  rng: Rng,
): OwnedRow[] {
  const rows: OwnedRow[] = [];
  const ids = [...owned.keys()].sort();
  for (const id of ids) {
    const all = printingsOf.get(id) ?? [];
    if (all.length === 0) continue; // a card with no printing cannot be held; the caller counts the shortfall
    const total = owned.get(id)!;
    const split = total >= 2 && all.length > 1 && rng() < 0.1;
    const parts = split ? [total - 1, 1] : [total];
    const used = new Set<string>();
    for (const qty of parts) {
      const options = all.slice(0, 4).filter((p) => !used.has(p.scryfallId));
      const p = options[Math.floor(rng() * Math.min(options.length, 3))] ?? all[0];
      used.add(p.scryfallId);
      const foil = p.finishes.includes("foil") && rng() < TARGETS.foilShare;
      rows.push({
        oracleId: id,
        setCode: p.setCode,
        collectorNumber: p.collectorNumber,
        scryfallId: p.scryfallId,
        finish: foil ? "foil" : "nonfoil",
        condition: rng() < 0.03 ? "mint" : "near_mint",
        quantity: qty,
      });
    }
  }
  return rows;
}

/** A stable fingerprint of the collection, for "same seed, same collection" checks. */
export function collectionFingerprint(rows: readonly OwnedRow[]): string {
  return rows
    .map((r) => `${r.oracleId}|${r.scryfallId}|${r.finish}|${r.condition}|${r.quantity}`)
    .sort()
    .join("\n");
}
