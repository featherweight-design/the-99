import type { JoinMode } from "./filter";
import { planeCopy } from "../copy/commanders-plane";
import { FLOOR_PCT } from "../discovery/floor";

/** The copy module interpolates every count through this form, and a figure has
    to be searched for in that form to be found inside a rendered sentence. */
const localised = (v: number) => v.toLocaleString("en-US");

const copy = planeCopy.exclusion;

/**
 * The exclusion line's sentence (§4), or null when nothing was excluded.
 *
 * TIER ORDER, never magnitude order: colour or mode first, then the sort. Two
 * clauses at most, so the sort's two populations — measured and short, and
 * nothing to measure — share one clause with two figures rather than taking
 * both slots.
 *
 * The nearest miss is a second SENTENCE, not a third clause, so it survives the
 * cap; it appears only when the sort is the sole exclusion, because with a
 * colour clause beside it the line is already at its width.
 */
export function resolveExclusionLine(input: {
  /** Rows the pips or the mode removed, counted against the ranked list. */
  colorExcluded: number;
  colors: string[];
  join: JoinMode;
  /** Rows measured against the floor and found short. Server-side, `new` only. */
  floorExcluded: number;
  /** The floor tier's other population: nothing to measure at all. */
  unmeasured: number;
  /** The nearest miss. Null when the server had no measured row to name. */
  bestPct: number | null;
  sort: "fit" | "new";
}): { text: string; figures: string[] } | null {
  const { colorExcluded, colors, join, unmeasured, bestPct, sort } = input;
  // `fit` measures nothing against a floor, so neither population exists under
  // it and a clause naming one would report an exclusion that never happened.
  const below = sort === "new" ? input.floorExcluded : 0;
  const missing = sort === "new" ? unmeasured : 0;

  const colorClause =
    colorExcluded > 0 && colors.length > 0
      ? join === "exactly"
        ? copy.join(colorExcluded, colors)
        : copy.colors(colorExcluded, colors)
      : null;

  // Sentence order, not tier order: the marks are found by searching the
  // finished sentence for each value in turn, so a figure listed out of order is
  // a figure the sentence has already walked past. The threshold and the nearest
  // miss are marked with their percent sign attached, which is both what the
  // drawing marks and what keeps `30` from matching some other row's `30`.
  const pct = `${FLOOR_PCT}%`;
  const floorFigures =
    below > 0 && missing > 0 ? [localised(below), pct, localised(missing)] : [localised(below), pct];

  if (colorClause === null) {
    // The sort alone, which is the form that has room for the nearest miss.
    if (below === 0 && missing === 0) return null;
    if (below === 0) return { text: copy.unmeasuredAlone(missing), figures: [localised(missing)] };
    const text =
      missing > 0
        ? bestPct == null
          ? copy.floorWithUnmeasured(below, missing, FLOOR_PCT)
          : copy.floorAloneWithUnmeasured(below, missing, FLOOR_PCT, bestPct)
        : bestPct == null
          ? copy.floor(below, FLOOR_PCT)
          : copy.floorAlone(below, FLOOR_PCT, bestPct);
    return {
      text,
      figures: bestPct == null ? floorFigures : [...floorFigures, `${bestPct}%`],
    };
  }

  const sortClause =
    below > 0 && missing > 0
      ? copy.floorWithUnmeasured(below, missing, FLOOR_PCT)
      : below > 0
        ? copy.floor(below, FLOOR_PCT)
        : missing > 0
          ? copy.unmeasuredAlone(missing)
          : null;

  return sortClause === null
    ? { text: colorClause, figures: [localised(colorExcluded)] }
    : {
        text: copy.join2(colorClause, sortClause),
        figures: [
          localised(colorExcluded),
          ...(below > 0 ? floorFigures : [localised(missing)]),
        ],
      };
}
