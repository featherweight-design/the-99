import type { Drop } from "../validate";

/**
 * Whether a Suggested changes v2 run is charged its credit or refunded (spec 2026-10-27 §9; 1 credit at any N, Hugh §12
 * Q2). Pure. Credits are whole: a run is charged or refunded, never split.
 *
 * - Both lists reach their target: charged.
 * - A short list is charged only when the PLAYER's own restrictions cost those cards: no model-caused drop on that list,
 *   and its shortfall no larger than its restriction drops. The run says which restriction bound it (§5.5).
 * - Anything else short is refunded whole: the model under-producing after its refill, a model-caused drop on a short
 *   list, a mix of the two with restriction drops, a failed cut call (plan P4), no additions at all (`ungrounded`).
 */

/** The player's own limits (§6.1), plus the bracket choice beside the request (the handoff's Keep / Down). */
export const RESTRICTION_RULES: ReadonlySet<Drop["rule"]> = new Set<Drop["rule"]>(["overCap", "offSet", "notOwned", "bracketAim"]);

export type ListOutcome = {
  /** Valid lines kept on this list. */
  kept: number;
  /** What this list had to reach: N for additions, min(N, kept additions) for cuts (§5.1a). */
  target: number;
  /** Every drop on this list, across its first ask and its refill. */
  drops: readonly Pick<Drop, "rule">[];
  /** Any call on this list returned fewer lines than it asked for. Aggregate counts cannot tell this apart from
   *  restriction drops (7 kept with 8 over the cap, then a refill of 3 that returned 2), so the engine says it. */
  underProduced?: boolean;
};

export type Charge =
  | { outcome: "spent" }
  | { outcome: "refunded"; why: "ungrounded" | "cutsFailed" | "shortByModel" };

export function chargeFor(run: { additions: ListOutcome; cuts: ListOutcome; cutsFailed?: boolean }): Charge {
  if (run.additions.kept === 0) return { outcome: "refunded", why: "ungrounded" };
  if (run.cutsFailed) return { outcome: "refunded", why: "cutsFailed" };
  for (const list of [run.additions, run.cuts]) {
    if (list.kept >= list.target) continue;
    const restriction = list.drops.filter((d) => RESTRICTION_RULES.has(d.rule)).length;
    const model = list.drops.length - restriction;
    if (model > 0 || list.underProduced || list.target - list.kept > restriction) return { outcome: "refunded", why: "shortByModel" };
  }
  return { outcome: "spent" };
}
