/**
 * Suggested changes v2's apply rule (spec 2026-10-27 §7, plan PR 4). Pure. The player picks M additions and M cuts from
 * one run's two lists and applies them as ONE set: equal counts keep the deck at its size, so a set is never one line.
 * More from the same pool later is a new set (§7a); a line already in a set, or settled some other way, is not offered.
 */

/** One line of the run, as the apply reads it under its locks. */
export type PickLine = {
  id: string;
  addOracleId: string | null;
  cutOracleId: string | null;
  verdict: string;
  applySet: string | null;
};

export type PickRefusal =
  /** No line named, or the two counts differ. */
  | "unequal"
  /** More of each than the player asked the run for (N). */
  | "overCount"
  /** A named line is not an open line of this run on that side (another run's, the other list's, applied, dismissed). */
  | "notOpen";

export type PickPlan = { ok: true; adds: PickLine[]; cuts: PickLine[] } | { ok: false; reason: PickRefusal };

const open = (l: PickLine) => l.verdict === "pending" && l.applySet === null;

export function planPicks(input: {
  requestedCount: number;
  lines: readonly PickLine[];
  addIds: readonly string[];
  cutIds: readonly string[];
}): PickPlan {
  const { addIds, cutIds } = input;
  const m = addIds.length;
  if (m === 0 || cutIds.length !== m) return { ok: false, reason: "unequal" };
  if (m > input.requestedCount) return { ok: false, reason: "overCount" };
  const byId = new Map(input.lines.map((l) => [l.id, l]));
  const pick = (ids: readonly string[], side: "add" | "cut"): PickLine[] | null => {
    if (new Set(ids).size !== ids.length) return null;
    const out: PickLine[] = [];
    for (const id of ids) {
      const l = byId.get(id);
      const onSide = side === "add" ? l?.addOracleId != null && l.cutOracleId === null : l?.cutOracleId != null && l.addOracleId === null;
      if (!l || !onSide || !open(l)) return null;
      out.push(l);
    }
    return out;
  };
  const adds = pick(addIds, "add");
  const cuts = pick(cutIds, "cut");
  if (!adds || !cuts) return { ok: false, reason: "notOpen" };
  return { ok: true, adds, cuts };
}
