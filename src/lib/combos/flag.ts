/**
 * `NEAR_COMBOS_ENABLED`: the combos a deck is one piece away from, with where that piece is
 * (`loadNearCombos`, plan `2026-10-22-near-combos-backend.md`). Backend only until Design prompt 17's
 * surface: unset on production, and the reader returns its empty answer while it is off. Read per
 * request; anything but the exact string `'true'` is off.
 */
export function nearCombosEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NEAR_COMBOS_ENABLED === "true";
}
