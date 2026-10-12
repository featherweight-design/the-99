/**
 * Whether tokens exist for a deck (handoff `design_handoff_the99_tokens`): the Tokens group on the
 * deck page, the token rows on Shopping, the card-details line and the About entry. Off, none of
 * them is rendered AND none is read: no loader call, no group, no row.
 *
 * The same shape as the other release switches: server-side, read per request, OFF for anything
 * but the exact string `'true'`. `'true'` on staging, unset on production until Hugh has read it.
 * The ingest, the prices and the ownership writes are data and run whatever this says.
 */
export function deckTokensEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DECK_TOKENS_ENABLED === "true";
}
