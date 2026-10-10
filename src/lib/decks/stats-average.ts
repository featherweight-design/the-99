// The "Against the average deck" card: what it is measured against (`AverageDeck`, resolved on the
// server through the basis chain) and the comparison itself (`averageComparison`, pure, run in the
// browser over the optimistic list so an edit moves the bars in the frame the deck moves).
//
// THE 99, NOT THE COMMANDER. EDHREC's eight type counts sum to exactly 99 on every payload measured
// (see `commander_support.avg_*`), so the deck's side is its 99 as well: the commander is not in it.
// The Curve card counts the commander and says so; this card says it counts the 99.
//
// ONE COUNT PER JOB. The job rows are the Jobs card's own tally (`jobTally`), graded against the
// index's `label_*` targets, so the page never shows two ramp numbers. Targets are asked for by
// LABEL basis whatever `LABEL_ROLE_COUNTS_ENABLED` says: the figures beside them are label counts.

import type { CompositionTargets } from "../profile/types";
import type { JobTally } from "./job-tally";
import { CARD_TYPES, CURVE_MAX, type CardType, type ManaCurve, type TypeCurve } from "./stats";

export type AverageBasisOf = "commander" | "pair" | "identity" | "count" | "baseline";

export type AverageDeck = {
  basis: {
    of: AverageBasisOf;
    /** The commanders' names, as the deck names them. */
    names: string[];
    /** `identity` rung: the deck's color name ("Jund"). `count` rung: "3-color". */
    label: string;
    /** EDHREC's deck count behind a commander or pair rung; null where the row carries none. */
    decks: number | null;
  };
  /** The average type counts, or null where no composition was derivable. */
  targets: CompositionTargets | null;
  /** The average deck's curve folded into the eight drawn buckets; null when the row carries none. */
  curve: number[] | null;
  /** The average deck's mana value over its nonland cards, from the unfolded curve. */
  manaValue: number | null;
  /** The four job targets (label basis), or null where the composition is measured and the roles are not. */
  roles: { ramp: number; draw: number; removal: number; wipes: number } | null;
};

export const AVERAGE_SCALE = 4;
export const AVERAGE_MV_SCALE = 1;
/** The mini curve's column, in px, and how many cards of difference fill it. */
export const MINI_MAX_PX = 22;
/** The canvas draws 20px per two cards of difference, capped at the column's 22px. */
export const MINI_PX_PER_TWO = 20;

export type AverageRowKey =
  | "lands" | "manaValue" | CardType | "ramp" | "draw" | "removal" | "wipes";
export type AverageGroupKey = "shape" | "types" | "jobs";

export type AverageRow = {
  key: AverageRowKey;
  you: number;
  avg: number;
  /** you - avg, to one decimal: the figure the bar, the words and the 'same' test all read. */
  diff: number;
  /** Bar length as a share of its end, capped at 1. */
  fill: number;
  /** The bar ran past its end and is cut off with a mark. */
  cut: boolean;
};

export type AverageComparison = {
  basis: AverageDeck["basis"];
  groups: { key: AverageGroupKey; rows: AverageRow[] }[];
  mini: { label: number; diff: number; px: number }[] | null;
  /** Cards in the 99 so far, and whether to say so (short of 99 and a bar is cut off). */
  cards: number;
  note: "baseline" | "thin" | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function row(key: AverageRowKey, you: number, avg: number, scale: number): AverageRow {
  // The words read the one-decimal difference; the bar and its cut-off read the raw one, as the canvas does.
  const diff = round1(you - avg);
  // Rounded far below any figure drawn, only so 2.4 against 3.4 is a gap of one and not 1.0000000000000002.
  const r = Math.round(Math.abs(you - avg) * 1e6) / 1e6 / scale;
  return { key, you, avg, diff, fill: Math.min(r, 1), cut: r > 1 };
}

export function averageComparison(
  average: AverageDeck,
  have: { curve: ManaCurve; types: TypeCurve; jobs: JobTally | null; cards: number },
): AverageComparison {
  const groups: AverageComparison["groups"] = [];
  if (average.targets) {
    const shape = [row("lands", have.curve.lands, average.targets.land, AVERAGE_SCALE)];
    if (average.manaValue !== null && have.curve.average !== null) shape.push(row("manaValue", have.curve.average, average.manaValue, AVERAGE_MV_SCALE));
    groups.push({ key: "shape", rows: shape });
    groups.push({ key: "types", rows: CARD_TYPES.map((t) => row(t, have.types.totals[t], average.targets![t], AVERAGE_SCALE)) });
  }
  if (average.roles && have.jobs) {
    const jobs = have.jobs;
    const count = (k: "ramp" | "draw" | "removal" | "wipes") => jobs.rows.find((r) => r.key === k)?.copies ?? 0;
    groups.push({
      key: "jobs",
      rows: (["ramp", "draw", "removal", "wipes"] as const).map((k) => row(k, count(k), average.roles![k], AVERAGE_SCALE)),
    });
  }
  const avgCurve = average.curve;
  const mini = avgCurve
    ? have.curve.buckets.map((b, i) => {
        const raw = b.copies - avgCurve[i];
        // The label reads the one-decimal gap, like the rows; a 0.04 gap is the same as the average, not 0.0 more.
        const diff = round1(raw);
        return { label: i, diff, px: diff === 0 ? 0 : Math.min((Math.abs(raw) / 2) * MINI_PX_PER_TWO, MINI_MAX_PX) };
      })
    : null;
  const anyCut = groups.some((g) => g.rows.some((r) => r.cut));
  return {
    basis: average.basis,
    groups,
    mini,
    cards: have.cards,
    note: average.basis.of === "baseline" ? "baseline" : have.cards < 99 && anyCut ? "thin" : null,
  };
}
