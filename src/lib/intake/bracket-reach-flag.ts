import { helpMeChooseEnabled } from "./flag";

/**
 * `BRACKET_REACH_ENABLED`: a Help me choose fill places the owned cards that reach the deck's
 * bracket answer (`bracket-reach.ts`, plan `2026-10-21-bracket-reach.md`). It never places a card to
 * buy. Off, the answer is a ceiling alone, as it shipped. Needs `HELP_ME_CHOOSE_ENABLED`; exactly
 * `'true'` turns it on.
 */
export function bracketReachEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.BRACKET_REACH_ENABLED === "true" && helpMeChooseEnabled(env);
}
