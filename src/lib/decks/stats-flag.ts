/**
 * Whether this deployment draws the deck's Stats view.
 *
 * Server-side, like `analysisTabEnabled`: read on the page, never `NEXT_PUBLIC_*`, and a change
 * needs a redeploy because Vercel binds variables to a deployment. Defaults off: absent, empty
 * or any string but `'true'` means the Stats segment does not exist and nothing about it is
 * fetched or drawn.
 */
export function deckStatsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.DECK_STATS_ENABLED === "true";
}
