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

/**
 * `BRACKET_REACH_ENABLED`: a Help me choose fill places the owned cards that reach the deck's
 * bracket answer (`bracket-reach.ts`, plan `2026-10-21-bracket-reach.md`). It never places a card to
 * buy. Off, the answer is a ceiling alone, as it shipped. Needs `HELP_ME_CHOOSE_ENABLED`; exactly
 * `'true'` turns it on.
 */
export function bracketReachEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.BRACKET_REACH_ENABLED === "true" && helpMeChooseEnabled(env);
}
