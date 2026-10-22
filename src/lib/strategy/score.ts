// A deck's top strategies: the type-line axes (`axes.ts`) and the 30 label themes, each scored `copies × ln(lift)`
// against the CATALOG's share (brief `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md`). Pure: the loader
// hands it the deck's nonland cards and the catalog baseline.
//
// DESCRIPTIVE, NEVER A VERDICT. Validated on staging, the score does not separate precons from tuned decks and has no
// tested "focused vs spread" threshold, so nothing here returns one: no grade, no target, no comparison with another
// deck. A figure is only meaningful against the deck's other axes.
import type { LabelTheme } from "../labels/types";
import { BASELINE_FLOOR, FIXED_AXES, axisCounts, axisScore, baselineShare, deckAxes, onAxis, type AxisCard, type AxisKey } from "./axes";

/** One nonland card of a list, with the label themes it carries. The caller drops lands and the commanders. */
export type StrategyCard = AxisCard & { themes: readonly LabelTheme[] };

/** A strategy: a type-line axis (`typal:<Type>` included) or a label theme. What a deck's focus names. */
export type StrategyKey = AxisKey | LabelTheme;

/** How many axes the radar draws at most. */
export const TOP_AXES = 5;

/**
 * Under this many nonland copies a list is too small to read: its axes are not yet stable. Measured on staging
 * (`pnpm measure:strategy`, the stability section), the floor the PR that set it states.
 */
export const MIN_NONLAND = 30;

/** The catalog's counts, one copy per commander-legal nonland game card. Built by `catalogBaseline`. */
export type StrategyBaseline = { axes: ReturnType<typeof axisCounts>; themes: ReadonlyMap<LabelTheme, number> };

export type StrategyAxis = {
  key: AxisKey | LabelTheme;
  family: "type" | "theme";
  copies: number;
  score: number;
};

export type DeckStrategy =
  | { state: "ok"; axes: StrategyAxis[] }
  /** No axis clears the floor. Not "unfocused": the vocabulary may simply have no word for the plan. */
  | { state: "none" }
  | { state: "tooSmall"; nonland: number };

/** Copies per label theme, a card counted once per theme it carries. */
export function themeCounts(cards: readonly StrategyCard[]): Map<LabelTheme, number> {
  const out = new Map<LabelTheme, number>();
  for (const c of cards) for (const t of new Set(c.themes)) out.set(t, (out.get(t) ?? 0) + c.quantity);
  return out;
}

/** The catalog baseline: every commander-legal nonland game card, one copy each (`quantity` 1). */
export function catalogBaseline(cards: readonly StrategyCard[]): StrategyBaseline {
  return { axes: axisCounts(cards), themes: themeCounts(cards) };
}

const themeShare = (b: StrategyBaseline, theme: LabelTheme) =>
  b.axes.total === 0 ? BASELINE_FLOOR : Math.max((b.themes.get(theme) ?? 0) / b.axes.total, BASELINE_FLOOR);

/** Every axis that scores above 0, best first (ties by copies, then key), before the top-N cut. */
export function scoredAxes(cards: readonly StrategyCard[], baseline: StrategyBaseline): StrategyAxis[] {
  const counts = axisCounts(cards);
  const out: StrategyAxis[] = [];
  for (const [key, copies] of deckAxes(counts)) {
    const score = axisScore(copies, counts.total, baselineShare(baseline.axes, key));
    if (score > 0) out.push({ key, family: "type", copies, score });
  }
  const typal = out.some((a) => a.key.startsWith("typal:"));
  for (const [theme, copies] of themeCounts(cards)) {
    // A creature type says more than the one `tribal` theme every type shares, so it replaces it.
    if (theme === "tribal" && typal) continue;
    const score = axisScore(copies, counts.total, themeShare(baseline, theme));
    if (score > 0) out.push({ key: theme, family: "theme", copies, score });
  }
  return out.sort((a, b) => b.score - a.score || b.copies - a.copies || a.key.localeCompare(b.key));
}

/** A deck's top strategies: at most `TOP_AXES`, never padded, and no verdict. */
export function deckStrategy(cards: readonly StrategyCard[], baseline: StrategyBaseline): DeckStrategy {
  const nonland = cards.reduce((n, c) => n + c.quantity, 0);
  if (nonland < MIN_NONLAND) return { state: "tooSmall", nonland };
  const axes = scoredAxes(cards, baseline).slice(0, TOP_AXES);
  return axes.length === 0 ? { state: "none" } : { state: "ok", axes };
}


const isTheme = (key: StrategyKey): key is LabelTheme => !(FIXED_KEYS.has(key) || key.startsWith("typal:"));
const FIXED_KEYS: ReadonlySet<string> = new Set(FIXED_AXES);

/** Whether one card counts toward a strategy, by the rule its copies are counted with. */
export function onStrategy(card: StrategyCard, key: StrategyKey): boolean {
  return isTheme(key) ? card.themes.includes(key) : onAxis(card, key);
}

/**
 * One strategy's axis on a list, scored or not: the deck's FOCUS, which stays the player's pick when it falls out of the
 * top five (READINESS, eng 2: drawn as a sixth row). Its copies are counted card by card (`onStrategy`), so a creature
 * type the deck no longer ranks still counts its own cards and its changelings.
 */
export function strategyAxis(cards: readonly StrategyCard[], baseline: StrategyBaseline, key: StrategyKey): StrategyAxis {
  const scored = scoredAxes(cards, baseline).find((a) => a.key === key);
  if (scored) return scored;
  const copies = cards.reduce((n, c) => n + (onStrategy(c, key) ? c.quantity : 0), 0);
  const total = cards.reduce((n, c) => n + c.quantity, 0);
  const share = isTheme(key) ? themeShare(baseline, key) : baselineShare(baseline.axes, key);
  return { key, family: isTheme(key) ? "theme" : "type", copies, score: axisScore(copies, total, share) };
}

/** A card of a list by its catalog id, for comparing two lists. */
export type KeyedStrategyCard = StrategyCard & { oracleId: string };

/** Copies a strategy gained and lost between two lists: `+added`, `−removed`. */
export type PendingChange = { added: number; removed: number };

/**
 * What changed on each strategy between the last committed version and the working list (READINESS, eng 4: every
 * pending change, from any source, because it counts the list). A card counts by its quantity change, toward every
 * strategy it is on. Keys with no change are left out.
 */
export function pendingChanges(
  committed: readonly KeyedStrategyCard[],
  live: readonly KeyedStrategyCard[],
  keys: readonly StrategyKey[],
): Partial<Record<StrategyKey, PendingChange>> {
  const byId = new Map<string, { card: KeyedStrategyCard; delta: number }>();
  for (const c of committed) {
    const e = byId.get(c.oracleId) ?? { card: c, delta: 0 };
    e.delta -= c.quantity;
    byId.set(c.oracleId, e);
  }
  // The live row wins as the card, so its labels are the ones read now.
  for (const c of live) {
    const e = byId.get(c.oracleId) ?? { card: c, delta: 0 };
    e.card = c;
    e.delta += c.quantity;
    byId.set(c.oracleId, e);
  }
  const out: Partial<Record<StrategyKey, PendingChange>> = {};
  for (const key of keys) {
    let added = 0;
    let removed = 0;
    for (const { card, delta } of byId.values()) {
      if (delta === 0 || !onStrategy(card, key)) continue;
      if (delta > 0) added += delta;
      else removed -= delta;
    }
    if (added || removed) out[key] = { added, removed };
  }
  return out;
}
