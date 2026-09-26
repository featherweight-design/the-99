import type { PrintedInSet } from "../sets/printed-in";

// The commander lanes' side of `Printed in` (filter-chassis decision 9): which rows a page ships
// an index for, and the options the panel draws. Pure, so the page and the view agree on both.

/**
 * The oracle ids a lane ships `LanePrintedIn` for, in the order it ships them: every list the
 * lane can show, each id once, first list first. The page builds the index from this and the view
 * files it against this, so the two are aligned by construction rather than by a second list.
 */
export function laneOracleIds(...lists: readonly (readonly { oracleId: string }[] | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const row of list ?? []) {
      if (seen.has(row.oracleId)) continue;
      seen.add(row.oracleId);
      out.push(row.oracleId);
    }
  }
  return out;
}

export type PrintedInOption = {
  /** Lower-case, as `LaneParams.printedIn` holds it. */
  code: string;
  label: string;
  /** The code as a reader sees it, after the set's name. */
  hint: string;
  count: number;
  disabled: boolean;
};

/**
 * One option per set a row on this lane was printed in, in `sets` order (newest first), each
 * counting the rows `counted` holds from that set. `counted` is the rows the OTHER controls left,
 * which is the `FilterPanelOption.count` contract: a set at 0 is out under those controls, so it
 * is drawn dimmed and cannot be ticked. A set the reader already chose stays live at 0, or the
 * filter that emptied the list is the one nobody can turn off.
 *
 * Rows are named by whatever key the lane filed them under: the owned lane's oracle ids, or
 * discover's slugs, since a discover row ships no oracle id.
 */
export function printedInOptions(
  sets: readonly PrintedInSet[],
  codesById: ReadonlyMap<string, readonly string[]>,
  laneIds: readonly string[],
  counted: readonly string[],
  selected: readonly string[],
): PrintedInOption[] {
  const onLane = new Set<string>();
  for (const id of laneIds) for (const code of codesById.get(id) ?? []) onLane.add(code);
  const counts = new Map<string, number>();
  for (const id of counted) {
    for (const code of codesById.get(id) ?? []) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return sets
    .filter((s) => onLane.has(s.code) || selected.includes(s.code))
    .map((s) => {
      const count = counts.get(s.code) ?? 0;
      return {
        code: s.code,
        label: s.name,
        hint: s.code.toUpperCase(),
        count,
        disabled: count === 0 && !selected.includes(s.code),
      };
    });
}

/**
 * Two shipped set lists as one, for a lane that has seen more than one payload: the newer list's
 * order first, then any set only the older one named. Both lists are newest first, and a later
 * payload of the same lane names a superset or a subset of the same sets, so this keeps the order.
 */
export function mergeSets(newer: readonly PrintedInSet[], older: readonly PrintedInSet[]): PrintedInSet[] {
  const seen = new Set(newer.map((s) => s.code));
  return [...newer, ...older.filter((s) => !seen.has(s.code))];
}
