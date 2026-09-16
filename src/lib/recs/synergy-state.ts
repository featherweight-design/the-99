import type { EdhrecFetchResult } from "../edhrec/client";

/**
 * "absent" and "degraded" both mean "no synergy data", but only "degraded" is
 * worth retrying: it signals a service outage, whereas "absent" is a settled
 * fact about a commander EDHREC does not index. Persisting them identically
 * would break the Retry button (see commanders/actions.ts).
 */
export type SynergyState = "ok" | "absent" | "degraded";

/**
 * The state of a LIVE EDHREC read. Used by `index-build.ts`, where the live
 * payload is the thing being described and stored.
 *
 * NOT for the scoring path any more — see `scoringSynergyState`. Ruling D moved
 * `fitSynergy` to the stored index, so a state derived from the live read can
 * contradict the figure, and `commander_scores` has a CHECK constraint on
 * exactly that pair.
 */
export function synergyStateFrom(r: EdhrecFetchResult): SynergyState {
  // Non-empty topCards, not merely non-null data: parseEdhrecPayload degrades to
  // an empty topCards list on an unexpected payload shape, and the index writes
  // a null edhrec_total for anything but "ok".
  if (r.data !== null && r.data.topCards.length > 0) return "ok";
  return r.unreachable ? "degraded" : "absent";
}

/**
 * The state that accompanies a SCORE.
 *
 * `commander_scores` enforces `(synergy_state = 'ok') = (fit_synergy is not
 * null)`, and after Ruling D those two came from different sources — the figure
 * from the stored index, the state from the live fetch. That pair is reachable
 * in both directions and either one aborts `persistScores`:
 *
 *   • A commander in the catalog but not yet in the index, whose EDHREC page
 *     exists: `"ok"` against a null figure. The catalog refreshes weekly and
 *     `db:build:index` runs monthly, so that window opens every month.
 *   • An indexed commander whose live fetch 404s or times out: `"absent"` or
 *     `"degraded"` against a non-null figure.
 *
 * So `"ok"` is decided by the SAME condition that produces the figure — the
 * index holding a usable total — which makes the constraint hold by
 * construction rather than by two sources happening to agree.
 *
 * `degraded` versus `absent` still comes from the live read, because that is
 * the only thing that can tell a transient outage from a settled fact, and it
 * is only asked when there is no figure to report anyway.
 *
 * TWO CONSEQUENCES, both recorded rather than answered, because both are copy
 * decisions and neither is this function's to make.
 *
 * 1. `degraded` now means "no index row AND the live read failed", and retrying
 *    a live read cannot add an index row — so the Retry button it drives can no
 *    longer change the score.
 *
 * 2. `absent` now covers a commander the INDEX has not reached, and its copy
 *    says "EDHREC doesn't track this commander"
 *    (`commander-explained.ts:366`), which is false in that case. The honest
 *    string would be "our index has not covered it yet", and there is no fourth
 *    state to hang it on — `commander_scores` constrains
 *    `synergy_state in ('ok','absent','degraded')`.
 *
 *    MEASURED before deciding it could wait. Against production's index: of the
 *    nine unindexed commanders a real collection turned up, EIGHT are indexed on
 *    production and one — `Scientist Supreme of A.I.M.` — genuinely is not, so
 *    for that one the shipped copy is true. The 16% gap a local run shows is
 *    local-dev's index being older (3,279 rows against production's 3,342), not
 *    a structural hole. What is left is the window between a set's weekly
 *    catalog refresh and the monthly `db:build:index` run, during which a
 *    newly-released commander reads as untracked.
 *
 *    That window is real and it is a regression: before Ruling D such a
 *    commander scored from the live read. It is bounded, it affects no
 *    commander in the steady state, and closing it properly needs either a
 *    fourth state with new copy or a more frequent index build. Both are
 *    decisions with owners, and inventing either inside a PR about where a
 *    figure comes from is how scope creeps.
 */
export function scoringSynergyState(
  live: EdhrecFetchResult,
  hasIndexedSynergy: boolean,
): SynergyState {
  if (hasIndexedSynergy) return "ok";
  return live.unreachable ? "degraded" : "absent";
}
