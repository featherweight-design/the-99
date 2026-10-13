/**
 * Whether this deployment shows deck notices (Hugh's release ruling, 2026-09-24): every feature
 * ships behind its own switch, on in staging and off in production until Hugh walks it.
 *
 * Modelled on `analysisTabEnabled`, and for the same reasons: SERVER-SIDE (never `NEXT_PUBLIC_*`),
 * it needs a REDEPLOY to change, and it DEFAULTS OFF, so production is unaffected until the
 * variable is set deliberately. Absent, empty, or any string but `'true'` is off.
 *
 * IT GATES EVERY PLAYER-VISIBLE PART: the tile's notice, the header's tag, the Notices sheet, the
 * check before the overview, H1's recompute on a press, and D11's overview check. It does NOT
 * gate the change log's writes in the ingests. Those are invisible, and writing them regardless
 * lets history accumulate, so the switch turns on over a log that already holds it.
 */
export function noticesEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NOTICES_ENABLED === "true";
}
