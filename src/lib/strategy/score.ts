// A deck's top strategies: the type-line axes (`axes.ts`) and the 30 label themes, each scored `copies × ln(lift)`
// against the CATALOG's share (brief `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md`). Pure: the loader
// hands it the deck's nonland cards and the catalog baseline.
//
// DESCRIPTIVE, NEVER A VERDICT. Validated on staging, the score does not separate precons from tuned decks and has no
// tested "focused vs spread" threshold, so nothing here returns one: no grade, no target, no comparison with another
// deck. A figure is only meaningful against the deck's other axes.
import type { LabelTheme } from "../labels/types";
import { BASELINE_FLOOR, axisCounts, axisScore, baselineShare, deckAxes, type AxisCard, type AxisKey } from "./axes";

/** One nonland card of a list, with the label themes it carries. The caller drops lands and the commanders. */
export type StrategyCard = AxisCard & { themes: readonly LabelTheme[] };

/** How many axes the radar draws at most. */
export const TOP_AXES = 5;

/**
 * Under this many nonland copies a list is too small to read: its axes are not yet stable. Measured on staging
 * (`pnpm measure:strategy`, the stability section), the floor the PR that set it states.
 */
export const MIN_NONLAND = 30;

/**
 * Themes so broad they lead lists with no sharp plan (research finding 5: Kaalia's average read "evasion, 30 copies").
 * They stay on the radar, because they are true, but lean-in is not offered for them.
 */
export const BROAD_THEMES: ReadonlySet<LabelTheme> = new Set<LabelTheme>(["evasion", "protection", "pump", "haste", "draw", "etbDraw"]);

/** The catalog's counts, one copy per commander-legal nonland game card. Built by `catalogBaseline`. */
export type StrategyBaseline = { axes: ReturnType<typeof axisCounts>; themes: ReadonlyMap<LabelTheme, number> };

export type StrategyAxis = {
  key: AxisKey | LabelTheme;
  family: "type" | "theme";
  copies: number;
  score: number;
  /** False for a broad theme: drawn, but lean-in is not offered on it. */
  leanable: boolean;
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
    if (score > 0) out.push({ key, family: "type", copies, score, leanable: true });
  }
  const typal = out.some((a) => a.key.startsWith("typal:"));
  for (const [theme, copies] of themeCounts(cards)) {
    // A creature type says more than the one `tribal` theme every type shares, so it replaces it.
    if (theme === "tribal" && typal) continue;
    const score = axisScore(copies, counts.total, themeShare(baseline, theme));
    if (score > 0) out.push({ key: theme, family: "theme", copies, score, leanable: !BROAD_THEMES.has(theme) });
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

