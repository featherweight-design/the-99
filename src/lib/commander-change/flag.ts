/**
 * Whether this deployment draws Change commander: the door on the commander's art, its sheet,
 * and the swap it writes (Hugh's release ruling, 2026-09-24: every feature ships behind its own
 * switch, on in staging and off in production until he walks it).
 *
 * The same shape as `swapToolsEnabled`: server-side, read per request, and OFF for anything but
 * the exact string `'true'`. With it off, the deck page draws today's `FullCardTrigger` unchanged
 * and `changeCommander` refuses (audit F6). Changing it on Vercel needs a redeploy.
 *
 * The draft's commander awareness is behind it too: with it off, `loadDraftState` reads no commander
 * column, and the claim read's `pending_decks` and the deck list's pending count emit the SQL they
 * did before a commander could move (`queries.test.ts` pins that byte for byte). Nothing but this
 * feature writes the live columns after creation, so off loses nothing. The one piece NOT gated is
 * Discard restoring the version's commander: it compares first and writes nothing unless they
 * differ, which with the switch off they never do.
 */
export function changeCommanderEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CHANGE_COMMANDER_ENABLED === "true";
}
