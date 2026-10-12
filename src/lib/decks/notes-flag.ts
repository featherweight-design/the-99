/**
 * Whether this deployment offers Deck notes: the notes actions, the read, the Notes view in Your deck
 * and the About entry. Server-side, read per request and OFF for anything but the exact string
 * `'true'`, the shape of `deckStatsEnabled`. Changing it needs a redeploy.
 */
export function deckNotesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DECK_NOTES_ENABLED === "true";
}
