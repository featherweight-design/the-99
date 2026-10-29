/**
 * The discovery line's switch (plan `2026-10-16-discovery-r2-r3.md`, decision 1): `feature`, no parent. The first-run
 * tour switch is retired (always on). About's reshape, the nudges and the `?tool=` landing carry no switch.
 */

/** `HELP_PANEL_ENABLED`: the "?" in the rail and the header, which opens its screen's About page (About visual PR 6a). */
export function helpPanelEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.HELP_PANEL_ENABLED === "true";
}

