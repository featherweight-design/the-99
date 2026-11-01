import type { RoleBasis } from "../profile/build";

/**
 * RETIRED (Hugh 2026-10-31): production has it on for everyone, and roles are always counted by
 * label. Baked in as on across src/lib's recs, discovery, commanders, profile and precons readers
 * (group 3, LABEL_ROLE_COUNTS part A) and the deck, tuning and coverage readers (part B). Readers
 * that still call this module: src/lib/switches/flags.ts (`labelRoleCountsEnabled`), the tests
 * src/lib/decks/label-role-counts.test.ts and src/lib/profile/stored.test.ts (`roleBasisFromEnv`),
 * `parseRoleBasis` in src/app/api/discovery-fields/route.ts and src/app/commanders/[slug]/coverage-action.ts
 * (which still accept a page's basis but always answer on labels), and the scripts that read the
 * variable. `envForPageBasis` was deleted in part B with its last caller.
 *
 * Whether this deployment counts a deck's roles from its cards' LABELS (the Jobs card's own tally,
 * `jobTally`) and grades them against the index's `label_*` targets, instead of the classifier's
 * `card.role` against `avg_*` (labels-everywhere plan, PR 2).
 *
 * Server-side, like `analysisTabEnabled`: read on the server, never `NEXT_PUBLIC_*`. Defaults off:
 * absent, empty or any string but `'true'` renders exactly what shipped before. Retired: its `off`
 * no longer reverts the label basis in src/lib, and rollback is a redeploy. A `plumbing` switch (admin PR 6d-2): an app-wide override
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
