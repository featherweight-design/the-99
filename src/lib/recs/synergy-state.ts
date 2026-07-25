import type { EdhrecFetchResult } from "../edhrec/client";

/**
 * "absent" and "degraded" both mean "no synergy data", but only "degraded" is
 * worth retrying: it signals a service outage, whereas "absent" is a settled
 * fact about a commander EDHREC does not index. Persisting them identically
 * would break the Retry button (see commanders/actions.ts).
 */
export type SynergyState = "ok" | "absent" | "degraded";

export function synergyStateFrom(r: EdhrecFetchResult): SynergyState {
  // Non-empty topCards, not merely non-null data: parseEdhrecPayload degrades to
  // an empty topCards list on an unexpected payload shape, and scoreCommander
  // leaves fitSynergy null for an empty list. Calling that "ok" would persist a
  // row whose synergyState contradicts its null fitSynergy.
  if (r.data !== null && r.data.topCards.length > 0) return "ok";
  return r.unreachable ? "degraded" : "absent";
}
