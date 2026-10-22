/**
 * `COMMANDERS_PLACE_ENABLED`: the Commanders place (menu and Home plan, `2026-10-22-menu-home.md`). Its tabs (For you,
 * Discover, Help me choose) and the redirects into them, and Discover leaving the bar, which takes Friends into the
 * bar's fifth slot while `SOCIAL_FRIENDS_ENABLED` is on for the reader. Exactly `'true'` turns it on; unset on
 * production. Off, every shipped route and the shipped bar render as today.
 */
export function commandersPlaceEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.COMMANDERS_PLACE_ENABLED === "true";
}
