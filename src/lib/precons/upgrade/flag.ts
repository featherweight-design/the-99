/**
 * `PRECON_UPGRADE_ENABLED`: whether a reader may run Upgrade this precon (brief `2026-11-10-upgrade-this-precon.md`;
 * Hugh, 2026-11-10: off for players until launch, on for him through an account override). Exactly `'true'` turns it on;
 * every caller passes the reader's resolved env (`requestFlags`). The variable set to `off` is the kill switch no override
 * raises (`resolve.ts`). It needs nothing else: the model-call kill switch still stops the paid run (`reserveModelCall`).
 */
export function preconUpgradeEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PRECON_UPGRADE_ENABLED === "true";
}
