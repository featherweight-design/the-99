/**
 * Whether this deployment draws the swap tools: the Shopping limit and its marks, the stand-ins
 * sheet, Take and Undo swap, and Fits your decks (Hugh's release ruling, 2026-09-24: every
 * feature ships behind its own switch, on in staging and off in production until he walks it).
 *
 * The same shape as `analysisTabEnabled`, and for the same reasons: server-side, read per request,
 * and OFF for anything but the exact string `'true'`, so production is unaffected until the
 * variable is set deliberately. Changing it on Vercel needs a redeploy.
 *
 * The H2 rename ("Undo swap" in the tuning panel) is not behind it: that panel sits inside the
 * Analysis tab, which `ANALYSIS_TAB_ENABLED` already gates.
 */
export function swapToolsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SWAP_TOOLS_ENABLED === "true";
}

/**
 * RETIRED (Hugh 2026-10-31): nothing gates on this. Find a deck's read follows swap tools
 * (`swapToolsEnabled`), its parent, wherever it is decided. Only the admin switch registry reads
 * this, until the switch is deleted.
 */
export function findADeckReadEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.FIND_A_DECK_READ_ENABLED === "true" && swapToolsEnabled(env);
}
