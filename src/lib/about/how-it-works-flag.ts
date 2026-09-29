/**
 * Whether this deployment draws About's "How the app reaches its answers" (Hugh's release ruling,
 * 2026-09-24: every feature ships behind its own switch, on in staging and off in production
 * until he walks it).
 *
 * Today it gates one thing: the method tags on the Analysis tab's "How we make these decisions"
 * sheet, read on the deck page. The appendix, its links, its contents group and its one line on
 * the sheet read it as they land (plan 2026-09-28-about-how-it-works, PRs B and C).
 *
 * The same shape as `helpMeChooseEnabled`: server-side, read per request, and OFF for anything but
 * the exact string `'true'`. Changing it on Vercel needs a redeploy.
 */
export function howItWorksEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.HOW_IT_WORKS_ENABLED === "true";
}
