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
 * A bump writes one `rules` entry at deploy, stated in words (`RULES_CHANGES` below;
 * `src/lib/notices/rules-entry.ts`). Version 1 is the rules as they stood when the log was created,
 * and writes nothing.
 */
export const BRACKET_RULES_VERSION = 1;

/**
 * What each version changed, in words, for the one `rules` entry its deploy writes: the rule's
 * name and what it now reads. Every version above 1 needs its row, in the same commit as the bump:
 * `rules-version.test.ts` fails without one, and a deploy that got past it writes no entry and
 * warns. Version 1 has none: it is where the log began.
 */
export const RULES_CHANGES: Readonly<Record<number, { rule: string; reads: string }>> = {};
