/**
 * Whether this deployment draws the Analysis tab.
 *
 * SERVER-SIDE, deliberately — not `NEXT_PUBLIC_*`. A public variable is inlined into the
 * client bundle at build time and served from a CDN, so its value is readable by anyone and
 * pinned to whatever the build saw. This one is read on the server, where the page is already
 * rendered on demand.
 *
 * IT STILL NEEDS A REDEPLOY TO CHANGE. Vercel binds environment variables to a deployment, so
 * adding or editing this on a project does NOT reach the running one — an operator who sets it
 * and reloads the page sees no tab, with the code, the read and this comment all apparently
 * correct. Set it, then redeploy.
 *
 * DEFAULTS OFF. Absent, empty, or any string but `'true'` means the tab does not exist — so
 * production is unaffected until the variable is set deliberately, rather than by a deploy
 * that happened to carry this code. The `'true'` spelling matches the repository variables
 * the workflows already use (`PRICE_REFRESH_ENABLED`, `COMBO_REFRESH_ENABLED`).
 *
 * IT GATES MORE THAN THE TAB. The Recommended mix strip moves into Analysis, which is how
 * Round 0 pays for the tab's vertical — so with the flag off the strip has to stay in the
 * header, or production loses it with no tab to receive it. One flag, two whole layouts.
 */
export function analysisTabEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ANALYSIS_TAB_ENABLED === "true";
}
