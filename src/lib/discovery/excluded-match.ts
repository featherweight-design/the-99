import type { NameMatchRow } from "./candidates";
import { clearsFloor, floorPct } from "./novelty";

/**
 * Why a name match is missing from the list, in the words the four-tier
 * precedence table uses (§3). Only the causes the SERVER decided are here: the
 * colour pips and the join mode narrow rows the client already holds, so asking
 * the server about them would be a round trip for an answer in memory.
 */
export type ExcludedCause = "built" | "hidden" | "floor" | "unmeasured";

export type ExcludedMatch = {
  oracleId: string;
  name: string;
  cause: ExcludedCause;
  /** The row's own support percentage, printed by the floor sentence as the
      distance the row fell short by. Null for every other cause, which has no
      figure to carry. */
  pct: number | null;
  /** The page a `hidden` match's **Open its page** opens: the slug the commander page resolves back
      to this commander. Set by the action after classification, so absent from what `classifyMatches`
      returns, and null when no list holds a slug for it (the state then offers no page). */
  slug?: string | null;
};

/**
 * Which of the server's exclusions removed each match, or none.
 *
 * A row that survives every test is not returned: it is in the list the client
 * already has, and either it is on screen or a pip removed it — both of which
 * the client can answer for itself and neither of which this can.
 */
export function classifyMatches(
  rows: NameMatchRow[],
  opts: { sort: "fit" | "new"; builtOracleIds: ReadonlySet<string>; hiddenOracleIds: ReadonlySet<string> },
): ExcludedMatch[] {
  const out: ExcludedMatch[] = [];
  for (const row of rows) {
    const base = { oracleId: row.oracleId, name: row.name };
    // Tier 1. Outermost: a built commander belongs to the other lane and is not
    // a candidate here at all, whatever the sort would have made of it. It
    // outranks a hide too: no list would draw it unhidden, so "you hid it" would
    // name a control that does not bring it back.
    if (opts.builtOracleIds.has(row.oracleId)) {
      out.push({ ...base, cause: "built", pct: null });
      continue;
    }
    // Tier 1b. The player's own hide, under either sort: it leaves the list
    // before the floor is measured, so the floor never had a say, and under `fit`
    // it is the one thing that removed the row, which the client cannot see.
    if (opts.hiddenOracleIds.has(row.oracleId)) {
      out.push({ ...base, cause: "hidden", pct: null });
      continue;
    }
    // `fit` excludes nothing else: the floor is the novelty sort's instrument.
    if (opts.sort === "fit") continue;

    const pct = floorPct(row);
    // Tier 3, the sort's other population: nothing to measure rather than
    // measured and short. The floor sentence prints a percentage this row does
    // not have, so it gets its own.
    if (row.tagTotal === 0 || pct == null) {
      out.push({ ...base, cause: "unmeasured", pct: null });
      continue;
    }
    // The floor reads `collectionSupport`: a row that fails here fails against
    // everything the player owns, so the floor is the whole of this tier.
    if (clearsFloor(row)) continue;
    out.push({ ...base, cause: "floor", pct });
  }
  return out;
}
