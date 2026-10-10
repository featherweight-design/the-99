import type { RoleBasis } from "../profile/build";

/**
 * Whether this deployment counts a deck's roles from its cards' LABELS (the Jobs card's own tally,
 * `jobTally`) and grades them against the index's `label_*` targets, instead of the classifier's
 * `card.role` against `avg_*` (labels-everywhere plan, PR 2).
 *
 * Server-side, like `analysisTabEnabled`: read on the server, never `NEXT_PUBLIC_*`, and a change
 * needs a redeploy because Vercel binds variables to a deployment. Defaults off: absent, empty or
 * any string but `'true'` renders exactly what shipped before. Turning it off is the rollback, and
 * no data moves back. It rides in the cached payloads' key through the deployment.
 */
export function labelRoleCountsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LABEL_ROLE_COUNTS_ENABLED === "true";
}

/** The basis the switch selects, for a reader that resolves targets. */
export function roleBasisFromEnv(env: NodeJS.ProcessEnv = process.env): RoleBasis {
  return labelRoleCountsEnabled(env) ? "labels" : "classifier";
}
