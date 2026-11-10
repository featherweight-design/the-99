import { normalizeName } from "../../synopsis/facts";
import { CARD_CAP_CENTS, MAX_SWAPS } from "./constants";

/**
 * What one reply's swaps must pass, in code (Hugh, 2026-11-10: "code checks every swap"). The measured replies were fully
 * clean in 8 of 19 runs: an add outside the pool 6 times, an add already in the deck 4, the same add twice 3, a cut not in
 * the deck 2 (two padded with a trailing space), the same cut twice 2. Pure: the run supplies the deck and the pool.
 */

export type DeckEntry = { oracleId: string; name: string; isCommander: boolean; /** A basic land: never a cut (nine copies share one id, and a basic is not what an upgrade is for). */ basic?: boolean };
export type PoolEntry = { oracleId: string; name: string; cents: number | null };

export type RawSwap = { out: string; in: string; reason: string };

export type UpgradePair = {
  cutId: string;
  cut: string;
  addId: string;
  add: string;
  /** The add's cheapest-printing price; null when unpriced (an unpriced add is dropped, never shown with a guess). */
  addCents: number;
  reason: string;
  position: number;
};

export type UpgradeDropRule =
  | "cutNotInDeck"
  | "cutCommander"
  | "cutBasic"
  | "duplicateCut"
  | "addNotInPool"
  | "addInDeck"
  | "duplicateAdd"
  | "overCard"
  | "unpriced";

export type UpgradeDrop = { position: number; rule: UpgradeDropRule; name: string };

export type UpgradeValidation = { kept: UpgradePair[]; drops: UpgradeDrop[]; overCeiling: number };

/**
 * Keeps each swap whose cut is in the deck (and not the commander), whose add is in the pool, not already in the deck and
 * not over the card cap, and which repeats neither a cut nor an add already kept (`already` carries a first answer's kept
 * pairs into a repair). Names match after `normalizeName`, so a trailing space or a curly apostrophe is not a miss; the
 * pair carries the CATALOG name. Keeps at most `MAX_SWAPS` in all; the rest are counted in `overCeiling`, not dropped.
 */
/** Names to entries, by the full catalog name and by each face of a double-faced card ("Delver of Secrets // Insectile Aberration"): a reply that names one face is still that card. The full name wins a clash. */
function byName<T extends { name: string }>(entries: readonly T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const e of entries) for (const face of e.name.split(" // ")) if (!m.has(normalizeName(face))) m.set(normalizeName(face), e);
  for (const e of entries) m.set(normalizeName(e.name), e);
  return m;
}

export function validateUpgrade(
  swaps: readonly RawSwap[],
  ctx: { deck: readonly DeckEntry[]; pool: readonly PoolEntry[]; already?: readonly UpgradePair[] },
): UpgradeValidation {
  const deck = byName(ctx.deck);
  const pool = byName(ctx.pool);
  const cuts = new Set((ctx.already ?? []).map((p) => p.cutId));
  const adds = new Set((ctx.already ?? []).map((p) => p.addId));
  const kept: UpgradePair[] = [];
  const drops: UpgradeDrop[] = [];
  let overCeiling = 0;
  const room = MAX_SWAPS - (ctx.already?.length ?? 0);
  swaps.forEach((s, position) => {
    const cut = deck.get(normalizeName(s.out));
    const add = pool.get(normalizeName(s.in));
    const drop = (rule: UpgradeDropRule, name: string) => void drops.push({ position, rule, name });
    if (!cut) return drop("cutNotInDeck", s.out);
    if (cut.isCommander) return drop("cutCommander", cut.name);
    if (cut.basic) return drop("cutBasic", cut.name);
    if (cuts.has(cut.oracleId)) return drop("duplicateCut", cut.name);
    if (deck.has(normalizeName(s.in)) || (add && ctx.deck.some((d) => d.oracleId === add.oracleId))) return drop("addInDeck", s.in);
    if (!add) return drop("addNotInPool", s.in);
    if (adds.has(add.oracleId)) return drop("duplicateAdd", add.name);
    if (add.cents === null) return drop("unpriced", add.name);
    if (add.cents > CARD_CAP_CENTS) return drop("overCard", add.name);
    if (kept.length >= room) { overCeiling++; return; }
    cuts.add(cut.oracleId);
    adds.add(add.oracleId);
    kept.push({ cutId: cut.oracleId, cut: cut.name, addId: add.oracleId, add: add.name, addCents: add.cents, reason: s.reason.trim(), position });
  });
  return { kept, drops, overCeiling };
}

/** The total of the buys, summed from the pairs in code: the model's own `buy_total` was wrong in 4 of 10 measured runs. */
export function buyTotalCents(pairs: readonly Pick<UpgradePair, "addCents">[]): number {
  return pairs.reduce((n, p) => n + p.addCents, 0);
}
