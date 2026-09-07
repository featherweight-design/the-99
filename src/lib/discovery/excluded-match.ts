import type { NameMatchRow } from "./candidates";
import { clearsFloor, floorPct } from "./novelty";

/**
 * Why a name match is missing from the list, in the words the four-tier
 * precedence table uses (§3). Only the causes the SERVER decided are here: the
 * colour pips and the join mode narrow rows the client already holds, so asking
 * the server about them would be a round trip for an answer in memory.
 *
 * `pool` is the floor's sub-case, not a fifth tier — the row fell below the
 * floor against the pool being scored and would have cleared it against the
 * whole collection, so the pool is the cause and the correction is the pool.
 */
export type ExcludedCause = "scope" | "floor" | "pool" | "unmeasured";

export type ExcludedMatch = {
  oracleId: string;
  name: string;
  cause: ExcludedCause;
  /** The row's own support percentage. Carried by both halves of the floor tier
      that measured one — `floor` and its `pool` sub-case — though only the floor
      sentence prints it: the pool sentence names the pool rather than the
      distance. Null for `scope` and `unmeasured`, which have no figure to carry. */
  pct: number | null;
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
  opts: { sort: "fit" | "new"; builtOracleIds: Set<string> },
): ExcludedMatch[] {
  const out: ExcludedMatch[] = [];
  for (const row of rows) {
    const base = { oracleId: row.oracleId, name: row.name };
    // Tier 1. Outermost: a built commander is not a candidate under this scope
    // at all, whatever the sort would have made of it.
    if (opts.builtOracleIds.has(row.oracleId)) {
      out.push({ ...base, cause: "scope", pct: null });
      continue;
    }
    // `fit` excludes nothing else — the floor is the novelty sort's instrument.
    if (opts.sort === "fit") continue;

    const pct = floorPct(row);
    // Tier 3, the sort's other population: nothing to measure rather than
    // measured and short. The floor sentence prints a percentage this row does
    // not have, so it gets its own.
    if (row.tagTotal === 0 || pct == null) {
      out.push({ ...base, cause: "unmeasured", pct: null });
      continue;
    }
    // The floor reads `collectionSupport`, so this is already the question the
    // pool sub-case used to ask second: a row that fails here fails against
    // everything the player owns, and the pool has nothing left to be blamed
    // for. `pool` therefore has no producer, and only `floor` remains.
    if (clearsFloor(row)) continue;
    out.push({ ...base, cause: "floor", pct });
  }
  return out;
}
