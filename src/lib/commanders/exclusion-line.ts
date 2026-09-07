import type { JoinMode } from "./filter";
import { planeCopy } from "../copy/commanders-plane";
import { FLOOR_PCT } from "../discovery/floor";

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
}): { text: string; figures: number[] } | null {
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

  // Only the COUNTS are marked. The two percentages in the sentence are the
  // rule and the nearest miss, and lifting `30` out of "the 30% support floor"
  // would mark the threshold as though it were one of the populations.
  const sortFigures = below > 0 && missing > 0 ? [below, missing] : below > 0 ? [below] : [missing];

  if (colorClause === null) {
    // The sort alone, which is the form that has room for the nearest miss.
    if (below === 0 && missing === 0) return null;
    const text =
      below > 0 && missing > 0
        ? bestPct == null
          ? copy.floorWithUnmeasured(below, missing, FLOOR_PCT)
          : copy.floorAloneWithUnmeasured(below, missing, FLOOR_PCT, bestPct)
        : below > 0
          ? bestPct == null
            ? copy.floor(below, FLOOR_PCT)
            : copy.floorAlone(below, FLOOR_PCT, bestPct)
          : copy.unmeasuredAlone(missing);
    return { text, figures: sortFigures };
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
    ? { text: colorClause, figures: [colorExcluded] }
    : {
        text: copy.join2(colorClause, sortClause),
        figures: [colorExcluded, ...sortFigures],
      };
}
