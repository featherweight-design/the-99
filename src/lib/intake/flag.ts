/**
 * RETIRED (Hugh 2026-11-01): nothing gates on this any more. Help me choose (the
 * `/commanders/choose` and `/decks/new/choose` routes, their doors, the Commanders place's Choose
 * tab, its one-credit read, `intake`, and the bracket answer as a fill's target) is always on; the
 * read's spend is stopped only by the model-call kill switch (`reserveModelCall`). Only the admin
 * registry reads this, until the switch is deleted. It once read true only for the exact string `'true'`.
 */
export function helpMeChooseEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.HELP_ME_CHOOSE_ENABLED === "true";
}
