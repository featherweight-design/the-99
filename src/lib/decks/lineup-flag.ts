/**
 * Whether `/decks` draws its Stats view (handoff `design_handoff_the99_lineup`, R2): the `Tiles · Stats`
 * switch, `?view=stats` and the Stats read. Off, there is no switch, no read, and the param is ignored.
 * Players read "Stats"; the code says `lineup`, the name ruling 5 gave it (Hugh, 2026-10-12).
 *
 * The same shape as the other release switches: server-side, read per request, OFF for anything but the
 * exact string `'true'`. `'true'` on staging, unset on production until Hugh has used it.
 */
export function lineupEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LINEUP_ENABLED === "true";
}
