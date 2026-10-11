/**
 * Whether Shopping for all decks exists (handoff `design_handoff_the99_all_decks_cart`): the
 * `/decks/shopping` route and, later, the entry line on `/decks`. Off, the route is a 404 and
 * nothing links to it.
 *
 * The same shape as the other release switches: server-side, read per request, OFF for anything
 * but the exact string `'true'`. `'true'` on staging, unset on production until Hugh has used it.
 */
export function allDecksCartEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALL_DECKS_CART_ENABLED === "true";
}
