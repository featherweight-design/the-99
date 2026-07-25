import type { EdhrecFetchResult } from "../edhrec/client";

/**
 * "absent" and "degraded" both mean "no synergy data", but only "degraded" is
 * worth retrying: it signals a service outage, whereas "absent" is a settled
 * fact about a commander EDHREC does not index. Persisting them identically
 * would break the Retry button (see commanders/actions.ts).
 */
export type SynergyState = "ok" | "absent" | "degraded";

export function synergyStateFrom(r: EdhrecFetchResult): SynergyState {
  if (r.data !== null) return "ok";
  return r.unreachable ? "degraded" : "absent";
}
