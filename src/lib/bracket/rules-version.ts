/**
 * The bracket-rules version: bumped only when logic that can move a stored verdict changes
 * (deck notices brief §6, plan D8). Kept apart from `PROFILE_VERSION`, whose bumps are builder
 * changes; logging every one of those would tell players a rule moved when none did.
 *
 * Bump it when any of these change:
 * - the limits and policies in `rules.ts` (`GAME_CHANGER_LIMIT`, `MASS_LAND_DENIAL_LIMIT`,
 *   `EXTRA_TURN_LIMIT_BRACKET_1`, `COMBO_POLICY`, `permitsFor`, `comboLandsEarly`);
 * - the tutor classifier the verdict reads (`classifyTutor`, `classifySearches`);
 * - the combo rule the verdict applies (`isInfiniteOrGameEnding` and the §4.3b piece rules).
 *
 * NOT for `isMassLandDenial` or `isExtraTurn`: those run inside the combo ingest, and their changes
 * reach decks as card-scoped flag entries the Combo refresh logs.
 *
 * A bump is to write one `rules` entry at deploy, stated in words. Neither that write nor the Combo
 * refresh's entries exist yet: both are the deck notices plan's PR 3, which reads this constant. Version 1 is the rules as they stood
 * when the log was created, and writes nothing.
 */
export const BRACKET_RULES_VERSION = 1;
