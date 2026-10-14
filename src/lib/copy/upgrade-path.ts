// What the upgrade path says: what a deck would have to give up to reach a bracket below it.
//
// Transcribed from `design_handoff_the99_push_line/push-line - copy strings.ts` (`upgradePath`),
// Round 4. The push line that module was named for is withdrawn (plan row 8b); these strings are
// the verdict's vocabulary now, and they land with the surface that draws them.
//
// THREE ERRATA APPLIED IN THE TRANSCRIPTION, each recorded where it was found:
//
//   · The module imported `@/lib/copy/shared`, which does not exist (`ERRATA-eng.md` §2). The
//     helpers live in `./deck-analysis`.
//   · Every call passed ONE bracket to `bracketPhrase`, which takes a range (R2 audit, item 5).
//     A single bracket is named by `BRACKET_NAMES` directly.
//   · `overlap` opened its sentence with a lower-case number word. It is capitalized here.
//
// CANDIDATES, NEVER A PICK. No string here names the card to cut when more than one would do,
// says "remove", or measures a distance to a bracket: each would dress the player's choice as the
// app's.

import type { Bracket } from "../bracket/types";
import { BRACKET_NAMES, nameList, numberWord } from "./deck-analysis";

const name = (bracket: Bracket) => BRACKET_NAMES[bracket];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const upgradePathCopy = {
  /** The climb's lower rung, and the sheet that opens from it (3b). Replaces `to drop to here`. */
  rungLabel: "To downgrade your deck",
  open: "what would have to go",
  /** `n` counts what must go: the copies a count rule asks for, plus one per combo to break. */
  heading: (bracket: Bracket, n: number) =>
    `${name(bracket)}, ${n === 1 ? "one thing" : `${numberWord(n)} things`} would have to go`,

  /**
   * CARDINALITY PICKS THE PHRASING, AND THE APP NEVER PICKS A CARD. "Any N of these M" while
   * M > N; the cards are NAMED when M === N, because "any 1 of these 1" dresses a certainty as a
   * choice, and naming a forced card is the rules choosing, not us.
   */
  countRule: {
    limit: (bracket: Bracket, limit: number, have: number) =>
      limit === 0
        ? `${name(bracket)} allows none, and you have ${have}.`
        : `${name(bracket)} allows ${limit}, and you have ${have}.`,
    anyOf: (removeCount: number, candidateCount: number) =>
      `Any ${removeCount} of these ${candidateCount} would do it.`,
    forced: (names: string[]) => `${nameList(names)} would have to go.`,
    /**
     * BLOCKED on a count: fewer cards can leave than must. The canvas draws this line and the
     * package gives it no key; it states what CAN come out, and the shortfall line below says why
     * that is not enough.
     */
    canComeOut: (n: number) =>
      n === 1 ? "One of them can come out." : `${capitalize(numberWord(n))} of them can come out.`,
  },

  /** The combo item states the requirement at the COMBO's cardinality, and never says "remove". */
  comboRule: {
    assembled: (bracket: Bracket) =>
      // Not "your tutors": a land-only search is not a tutor (2026-09-22) and still finds a
      // land half. And not "can find both halves" either: `comboLandsEarly` counts a commander
      // half as covered with no search at all, so "assemble" is the verb true of both.
      `This deck can assemble this one, which is what puts it past ${name(bracket)}.`,
    forbidden: (bracket: Bracket) => `${name(bracket)} doesn’t allow two-card combos at all.`,
    /** At Upgraded, a combo producing infinite turns — whether or not the tutors can find it. */
    loop: (bracket: Bracket) => `${name(bracket)} doesn’t allow a loop of extra turns.`,
    either: "Either half breaks it.",
  },

  /** Said once, in the foot. Cheaper than de-duplicating items, which would hide a rule. */
  overlap: (n: number) =>
    `${capitalize(numberWord(n))} of these ${n === 1 ? "is" : "are"} also the combo, so cutting `
    + `one can answer both lines at once.`,
  yours: "Which cards go is yours. This is what the bracket asks for, not a recommendation.",

  /** `items: []`. Hands the reader to the declaration, the only thing left that can answer it. */
  satisfied: (bracket: Bracket, range: string) =>
    `Nothing would have to go. Your cards already sit inside ${name(bracket)}. Whether this deck `
    + `is ${range} is yours to say.`,

  /** `blocked`. Plain: no --danger, no warning glyph, never "impossible" or "sorry". */
  blocked: {
    commanderTag: "your commander",
    heading: (bracket: Bracket) => `${name(bracket)}, not reachable by removing cards`,
    /**
     * `commanders` is how many commanders hold the rule, `left` how many copies over the limit
     * remain once every other card is gone. Both are figures, never assumed: a partner pair can
     * both be game changers, and a commander can be the deck's only one.
     */
    countShortfall: (bracket: Bracket, commanders: number, left: number) =>
      `The rest ${commanders === 1 ? "is your commander" : "are your commanders"}, and a commander `
      + `can’t be cut. Removing everything else still leaves ${numberWord(left)}, so `
      + `${name(bracket)} isn’t reachable by removing cards. It would take a different `
      + `commander.`,
    comboShortfall: (bracket: Bracket) =>
      `Both halves of this combo are in your command zone, so no removal breaks it. `
      + `${name(bracket)} isn’t reachable by removing cards. It would take a different commander.`,
  },
} as const;
