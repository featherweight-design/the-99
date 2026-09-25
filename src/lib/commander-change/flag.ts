/**
 * Whether this deployment draws Change commander: the door on the commander's art, its sheet,
 * and the swap it writes (Hugh's release ruling, 2026-09-24: every feature ships behind its own
 * switch, on in staging and off in production until he walks it).
 *
 * The same shape as `swapToolsEnabled`: server-side, read per request, and OFF for anything but
 * the exact string `'true'`. With it off, the deck page draws today's `FullCardTrigger` unchanged
 * and `changeCommander` refuses (audit F6). Changing it on Vercel needs a redeploy.
 *
 * The draft's commander awareness (a commander change counting as a change, Discard restoring the
 * columns) is NOT behind it: that is correctness for any path that moves the live columns.
 */
export function changeCommanderEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CHANGE_COMMANDER_ENABLED === "true";
}
