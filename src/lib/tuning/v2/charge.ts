import type { Drop } from "../validate";

/**
 * Whether a Suggested changes v2 run is charged its credits or refunded (spec 2026-10-27 §9). Pure. Credits are whole: a
 * run is charged or refunded, never split. What it costs is `unitsFor` (1 credit up to 10 swaps, 2 above, Hugh
 * 2026-10-30; it was 1 at any N, §12 Q2).
 *
 * - Both lists reach their target: charged.
 * - A short list is charged only when the PLAYER's own restrictions cost those cards: no model-caused drop on that list,
 *   and its shortfall no larger than its restriction drops, or the owned shortlist was exhausted (an owned-only run that
 *   used every owned card that fits: its shortfall is the player's limit however few lines the model wrote). The run says
 *   which restriction bound it (§5.5).
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
  /** Owned-only, and every card of a complete owned pool (both tiers, `completeOwnedPool`) was kept or dropped
   *  (`V2List.poolExhausted`): the list is short by
   *  the player's limit, so neither under-producing nor a gap past the restriction drops refunds it. A model-caused drop
   *  still does. */
  poolExhausted?: boolean;
};

/** The most swaps a one-credit run asks for (Hugh, 2026-10-30): 1 to 10 cost 1 credit, 11 to `MAX_COUNT` cost 2. */
export const ONE_CREDIT_MAX_COUNT = 10;

/**
 * The credits a v2 run costs, from the count the player REQUESTED (never what the run kept): 1 for N up to
 * `ONE_CREDIT_MAX_COUNT`, else 2. Reserved whole as `model_calls.units`; a refund returns all of it. Pure.
 */
export function unitsFor(requestedCount: number): 1 | 2 {
  return requestedCount <= ONE_CREDIT_MAX_COUNT ? 1 : 2;
}

export type Charge =
  | { outcome: "spent" }
  | { outcome: "refunded"; why: "ungrounded" | "cutsFailed" | "budget" | "shortByModel" };

export function chargeFor(run: { additions: ListOutcome; cuts: ListOutcome; cutsFailed?: boolean; budgetReached?: boolean }): Charge {
  if (run.additions.kept === 0) return { outcome: "refunded", why: "ungrounded" };
  if (run.cutsFailed) return { outcome: "refunded", why: "cutsFailed" };
  // The run budget cut it short (plan P2): it finishes with what it has and is refunded, whatever the drops say.
  if (run.budgetReached) return { outcome: "refunded", why: "budget" };
  for (const list of [run.additions, run.cuts]) {
    if (list.kept >= list.target) continue;
    const restriction = list.drops.filter((d) => RESTRICTION_RULES.has(d.rule)).length;
    const model = list.drops.length - restriction;
    if (model > 0) return { outcome: "refunded", why: "shortByModel" };
    if (!list.poolExhausted && (list.underProduced || list.target - list.kept > restriction)) return { outcome: "refunded", why: "shortByModel" };
  }
  return { outcome: "spent" };
}
