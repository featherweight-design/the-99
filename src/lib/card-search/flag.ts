/**
 * `CARD_SEARCH_ENABLED`: looking up any card by name from anywhere (plan `2026-10-16-card-search.md`). `'true'` on
 * staging, unset on production until Hugh walks it. Exactly `'true'` turns it on. Off, the search actions answer
 * empty, and nothing draws the phone icon, the sheet, the rail slot, the shortcut or the About entry. Quick return,
 * the header's half of the line, is not behind it.
 */
export function cardSearchEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.CARD_SEARCH_ENABLED === "true";
}
