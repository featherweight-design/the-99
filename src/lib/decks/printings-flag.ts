/**
 * Whether this deployment lets a deck choose its printing of a card (deck printings, plan
 * `2026-10-10-deck-printings.md`). Off means `main`: no deck scope reaches card details, the
 * resolver skips the deck's pick, prices take no picks, versions record nothing, and import writes
 * no picks. Stored picks are kept either way, so turning it back on restores them.
 *
 * The same shape as the other release switches: server-side, read per request, and OFF for
 * anything but the exact string `'true'`. Changing it on Vercel needs a redeploy.
 */
export function deckPrintingsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.DECK_PRINTINGS_ENABLED === "true";
}
