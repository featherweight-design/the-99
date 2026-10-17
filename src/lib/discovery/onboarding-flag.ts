/**
 * The discovery line's two switches (plan `2026-10-16-discovery-r2-r3.md`, decision 1). Both are `feature`, both have no
 * parent, and both are `'true'` on staging from the PR that first draws them and unset on production until Hugh turns
 * them on. Exactly `'true'` turns each on. About's reshape, the nudges and the `?tool=` landing carry no switch.
 */

/** `HELP_PANEL_ENABLED`: the "?" in the rail and the header, its panel, and `GET /api/about/entries`. */
export function helpPanelEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.HELP_PANEL_ENABLED === "true";
}

/**
 * `FIRST_RUN_TOUR_ENABLED`: the first-run tour, `/?tour=1`, and both `Take the tour` presses. With `MOMENTS_ENABLED` off
 * the tour still runs (R3 gap 13), so it names no parent.
 */
export function firstRunTourEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.FIRST_RUN_TOUR_ENABLED === "true";
}
