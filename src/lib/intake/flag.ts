/**
 * Whether this deployment draws Help me choose: the `/decks/new/choose` route and both of its doors
 * (Hugh's release ruling, 2026-09-24: every feature ships behind its own switch, on in staging and
 * off in production until he walks it).
 *
 * The same shape as `swapToolsEnabled`: server-side, read per request, and OFF for anything but
 * the exact string `'true'`. Changing it on Vercel needs a redeploy. One reader gates the route
 * (not-found when off) and both doors (F3).
 */
export function helpMeChooseEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.HELP_ME_CHOOSE_ENABLED === "true";
}
