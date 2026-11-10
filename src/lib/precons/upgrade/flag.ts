/**
 * `PRECON_UPGRADE_ENABLED`: whether a reader may run Upgrade this precon (brief `2026-11-10-upgrade-this-precon.md`;
 * Hugh, 2026-11-10: off for players until launch, on for him through an account override). Exactly `'true'` turns it on;
 * every caller passes the reader's resolved env (`requestFlags`).
 * Its kill is the app-wide `killed` override row (only `MODEL_CALLS_ENABLED` still reads its variable). It needs nothing else: the
 * model-call kill switch still stops the paid run (`reserveModelCall`).
 */
export function preconUpgradeEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PRECON_UPGRADE_ENABLED === "true";
}
