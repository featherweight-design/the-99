import { GAME_ENDING_FEATURES, INFINITE_TURN_FEATURES } from "./produces-kinds.generated";

/**
 * What a combo's `produces` names mean for a bracket verdict.
 *
 * **Card count alone is never the test.** A two-card variant producing "two 1/1 tokens" is a
 * synergy, and slotting a deck to Bracket 4 over one would be a wrong verdict of exactly the
 * kind that lands on a table. The test is `card_count = 2` AND a feature that is unbounded or
 * game-ending.
 *
 * **`bracketTag` is deliberately not consulted here — this function takes no such argument.**
 * Every variant carries one and the vocabulary echoes WotC's bracket names, which is what
 * makes it look like the answer. It is Spellbook's judgement about which table a combo suits,
 * not whether the combo is infinite, and the two disagree freely. The bulk's own first record
 * — Gilder Bairn + Agatha's Soul Cauldron + Bloom Tender, producing "Infinite mana of colors
 * among permanents you control" — carries `E`, Exhibition, their gentlest tag. Verified on the
 * live bulk 2026-09-20. A rule built on it would read that variant as harmless.
 */

/**
 * The `Infinite …` family, matched live rather than from the generated list.
 *
 * A regex here and an allowlist below, deliberately: the family GROWS — upstream adds
 * "Infinite <something>" names between our regenerations — and a new one is unambiguously
 * unbounded by its own name, so matching it costs nothing and missing it under-slots a deck.
 * The game-ending names have no such shape ("Win the game", "Target opponent loses the game"),
 * so those are enumerated and an unrecognised one defaults to NOT game-ending — the
 * under-claiming direction, same argument as `tag-kinds`' allowlist.
 */
const INFINITE = /^infinite /i;

/** Unbounded or game-ending — the second half of the two-card-infinite test. */
export function isInfiniteOrGameEnding(features: readonly string[]): boolean {
  return features.some((f) => INFINITE.test(f) || GAME_ENDING_FEATURES.includes(f));
}

/**
 * Spellbook's own feature for a loop that cannot be stopped by choice: every trigger in it is
 * mandatory, so once it starts the game is drawn unless something outside the loop breaks it.
 * Marauding Raptor's 2 damage to each creature entering, with Polyraptor copying itself when
 * dealt damage, is the case (variant 2062-3356). A loop with a "may" in it (Forerunner of the
 * Empire's damage) carries no such feature, because its controller can decline and end it.
 * Read from `produces`, so the any-size read and the profile's two-card fallback agree. Measured on
 * staging 2026-10-11: 294 variants, 134 of them two-card (the generated vocabulary's own count, from
 * its own run, is 289).
 */
export const DRAW_THE_GAME = "Draw the game";

/** Whether a variant's features say its loop is mandatory. */
export function isMandatoryLoop(features: readonly string[]): boolean {
  return features.includes(DRAW_THE_GAME);
}

/**
 * Specifically a TURN loop, which WotC's B2/B3 clause forbids by name: extra-turn cards
 * "are not intended to be chained in succession or looped".
 *
 * This is the measurable half of that rule (plan R3). An assembled combo producing infinite
 * turns is a loop on upstream's own data — no authored classifier, no invented threshold —
 * so it violates the clause and the combo is the receipt. The OTHER half, a single card that
 * loops itself (Nexus of Fate), has no published definition and no fixture of undisputed
 * cases to measure against, so it does not ship and the detection statement says so.
 *
 * Confirmed against the live bulk 2026-09-20: the exact upstream name is `Infinite turns`.
 */
export function producesInfiniteTurns(features: readonly string[]): boolean {
  return features.some(
    (f) => /^infinite (extra )?turns?\b/i.test(f) || INFINITE_TURN_FEATURES.includes(f),
  );
}

/**
 * §6.5's provenance string for combo detection, living beside the classifier it describes so
 * that `buildDeckProfile` (a later PR) has one definition to read rather than reaching into a
 * module that does not exist yet.
 */
export const COMBO_DETECTION = {
  /** One method, and unlike the other two it is entirely external. Named for the reason on
   *  `MLD_DETECTION.methods`. */
  methods: ["Commander Spellbook's combo index"],
  basis: "Spellbook's index, excluding template-gated variants",
} as const;
