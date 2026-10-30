/**
 * `FLYER_TRIAL_ENABLED` (Hugh, 2026-10-30): the card-store flyer trial: flyer codes on `/join`, the sign-up that
 * draws on Hugh's invites, the /admin flyer codes and the launch list. Off, every flyer code reads as ended and no
 * claim is taken; a sign-up already claimed is honored. Turning it off at public launch retires every code. Exactly
 * `'true'` turns it on.
 */
export function flyerTrialEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.FLYER_TRIAL_ENABLED === "true";
}
