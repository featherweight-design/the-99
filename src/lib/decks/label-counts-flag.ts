import type { RoleBasis } from "../profile/build";
import { KILL } from "../switches/resolve";

/**
 * Whether this deployment counts a deck's roles from its cards' LABELS (the Jobs card's own tally,
 * `jobTally`) and grades them against the index's `label_*` targets, instead of the classifier's
 * `card.role` against `avg_*` (labels-everywhere plan, PR 2).
 *
 * Server-side, like `analysisTabEnabled`: read on the server, never `NEXT_PUBLIC_*`. Defaults off:
 * absent, empty or any string but `'true'` renders exactly what shipped before. Turning it off is
 * the rollback, and no data moves back. A `plumbing` switch (admin PR 6d-2): an app-wide override
 * flips it without a deploy, so a reader passes the resolved env, and a cached payload that depends
 * on it carries the basis in its own key (`discoveryKey`, `commanderRankingsKey`, the scores'
 * `writer_version`) rather than relying on the deployment.
 */
export function labelRoleCountsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.LABEL_ROLE_COUNTS_ENABLED === "true";
}

/** The basis the switch selects, for a reader that resolves targets. */
export function roleBasisFromEnv(env: NodeJS.ProcessEnv): RoleBasis {
  return labelRoleCountsEnabled(env) ? "labels" : "classifier";
}

/** A role basis named by a request (a follow-up asking for the page's own basis), parsed to the
 *  closed set; anything else is null, which the caller refuses. */
export function parseRoleBasis(value: unknown): RoleBasis | null {
  return value === "labels" || value === "classifier" ? value : null;
}

/**
 * The env a FOLLOW-UP request reads under: the reader's resolved switches with the role basis set
 * to the one the page it serves was counted by, or null when that basis cannot be read now.
 *
 * A follow-up (a fields batch, a retry) completes a page the reader already holds, so its answer
 * must be the page's basis, not whatever the switch resolves to by the time it lands: an app-wide
 * flip in between would merge the other basis's figures into the page (admin PR 6d-2). The basis
 * is plumbing and gates nobody's data, so honoring the asked-for one is safe. The one thing it
 * never does is raise the ENVIRONMENT's kill switch (`off`): a labels page that outlived it gets
 * null (nothing; the caller's empty answer leads to a fresh read), never the classifier's figures.
 * Read off the environment itself, because the proxy's switch header carries one bit per switch
 * and cannot say `off`.
 */
export function envForPageBasis(
  resolved: NodeJS.ProcessEnv,
  basis: RoleBasis,
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv | null {
  if (environment.LABEL_ROLE_COUNTS_ENABLED === KILL) return basis === "labels" ? null : resolved;
  return { ...resolved, LABEL_ROLE_COUNTS_ENABLED: basis === "labels" ? "true" : "false" };
}
