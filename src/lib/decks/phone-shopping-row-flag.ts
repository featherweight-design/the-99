/**
 * Whether this deployment draws the phone Shopping row's option B (Social R2, PR 7; Hugh chose B on the
 * round 3 boards, 2026-10-15): the name gets line 1 with the ✕, the front face only for a two-face card,
 * `over $N` folds into an outlined buy tag and joins the key.
 *
 * It changes the row for EVERY reader, social switches off too, so it ships behind a switch of its own and
 * Hugh decides whether B reaches everyone. Off, the row is exactly as shipped. Desktop is unchanged either way.
 *
 * The same shape as `neverCutEnabled`: server-side, read per request, OFF for anything but the exact string
 * `'true'`.
 */
export function phoneShoppingRowBEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PHONE_SHOPPING_ROW_B_ENABLED === "true";
}
