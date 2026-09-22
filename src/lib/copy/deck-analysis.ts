// The words the deck-analysis surface says about brackets and about its own detection.
//
// TWO PIECES LAND HERE AHEAD OF THE COMPONENTS THAT DRAW THEM, because both carry MEASURED
// facts and the rest of the round's copy does not: the bracket names, which are WotC's and may
// not be paraphrased, and the four detection statements, which quote figures that live in code.
// The verdict block's own strings arrive with the block.
//
// THE DETECTION SENTENCES ARE TEMPLATED ON THE CONSTANTS, NEVER TRANSCRIBED. The handoff's copy
// file says "Between them they name 23 of the 24 cards we would expect" and names ONE miss,
// where `MLD_DETECTION` says **22 of 24** with **two** — `Cataclysm` appears nowhere in the
// drop. A hand-written sentence holding a re-measurable figure has now desynced once BEFORE
// shipping, which is the whole argument for building the sentence from the figure.
//
// The misses slot takes a LIST rather than a name, for the same reason: the previous form could
// only hold one, so the second miss had nowhere to go and the sentence read as complete.

import {
  COMBO_DETECTION,
  EXTRA_TURN_DETECTION,
  MLD_DETECTION,
} from "../bracket/rules";
import type { Bracket } from "../bracket/types";

/**
 * The Commander Format Panel's own names, verbatim. Not ours to reword: a player carries a
 * bracket to a pod and says the word out loud, so a synonym here is a different claim there.
 */
export const BRACKET_NAMES: Record<Bracket, string> = {
  1: "Exhibition",
  2: "Core",
  3: "Upgraded",
  4: "Optimized",
  5: "cEDH",
} as const;

/** `Optimized`, or `Optimized or cEDH` — the permitted side, spoken. */
export function bracketPhrase(permits: readonly Bracket[]): string {
  const names = permits.map((b) => BRACKET_NAMES[b]);
  return names.length === 1 ? names[0] : names.join(" or ");
}

/** `4 Optimized` — the numeral and the name, which every verdict face draws together. */
export function bracketFace(bracket: Bracket): string {
  return `${bracket} ${BRACKET_NAMES[bracket]}`;
}

/**
 * "Wave of Vitriol and Cataclysm" — an Oxford-free list, because these are read aloud.
 *
 * Exported because Round 4's copy reaches for it: a helper that is private here is one every
 * other copy module writes again, and two implementations of a joiner drift on the comma.
 */
export function nameList(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const mldMisses = nameList(MLD_DETECTION.knownMisses);

export const deckAnalysisCopy = {
  brackets: BRACKET_NAMES,

  /**
   * The Analysis tab's own readings, before any verdict is drawn.
   *
   * Transcribed from `design_handoff_the99_deck_analysis/deck-analysis - copy strings.ts`.
   * NO SENTENCE IS SHIPPED — what a summary may claim belongs to sub-project 6, and
   * `commander_support.prose` is the precedent for the null state: a row that fails its accept
   * contract stores nothing and the surface draws no paragraph.
   *
   * The `absent` reading carries NO control here. Design's state 2 pairs it with `Write one` and
   * "about five seconds", and both are correct for the round that can generate one — offering a
   * button that cannot write is worse than the plain sentence, so the strings are transcribed
   * and left unused until something can honour them.
   */
  panel: {
    /**
     * Round 4's t1 — never determined. Its label and its cost, in the plain form: that round
     * gives the control three weights, a fixed position and a tab dot, and refines this.
     *
     * "about two seconds" is the WORST case, not the median. Measured over all 20 real decks on
     * staging: 630ms median, 559ms fastest, 1.8-2.2s slowest. A control promising one second and
     * taking two has broken a promise; one promising two and taking half a second has not.
     */
    analyze: "Analyze this deck",
    analyzeCost: "about two seconds",
    /** Round 4's t2 — determined, nothing changed since. The re-ask, which has to stay reachable
     *  or an edited deck can never be re-read. */
    again: "Analyze again",
    /**
     * In flight. NO COUNT IN IT: `loadProfileHead` reads whatever `deck_cards` holds, so a brew
     * with twelve cards would be told we were reading all 99. An earlier draft said exactly
     * that.
     */
    reading: "Reading your deck\u2026",
    /**
     * The profile could not be built. NEVER "something went wrong": a reader who pressed a
     * button is owed what is and is not affected, and the counted figures are unaffected.
     */
    failed:
      "We could not finish reading this deck. The mix below is counted from your list and is "
      + "true now.",
    retry: "Try again",
  },

  synopsis: {
    heading: "What this deck is",
    /** 2 - never generated. The only reading reachable until sub-project 6 ships. */
    absent: "No summary has been written for this deck yet.",
    /** Transcribed and deliberately unused: see the note on `panel`. */
    write: "Write one",
    writeCost: "about five seconds",
    /** 3 - stale. */
    staleTag: "out of date",
    staleCount: (changed: number, total: number) =>
      `${changed} of ${total} cards have changed since it was written`,
    staleProvenance: (was: number, total: number) => `written against ${was} of these ${total}`,
    rewrite: "Write it again",
    verdictCurrent: "recounted just now",
    /** 4 - refused by the accept contract. Never "something went wrong". */
    refusedTag: "not written",
    refused:
      "We wrote a summary and it did not check out against your list, so we are not showing "
      + "it. Nothing about your deck changed.",
    refusedCount: (failed: number, total: number) =>
      `${failed} of ${total} claims failed checking`,
    retry: "Try again",
  },

  /**
   * "How we make these decisions" — four rows, one per rule.
   *
   * Game changers carries NO misses line, deliberately: it is the contrast that makes the other
   * three legible. A reader who sees three caveats and one flat statement learns which figure is
   * exact without being told.
   */
  detection: {
    gameChangers: {
      from: "Wizards publishes the list, and we check your 99 against it. This count is exact.",
      source: "the Commander Format Panel's bracket rules",
    },
    landDenial: {
      // NAMED, never counted. The previous form said we read the rules text against
      // "2 community-maintained ones" — built from `MLD_DETECTION.sources`, and false: there is
      // no second list. The two are Spellbook's estimate and our own reading, and saying so is
      // both true and more use to a reader deciding how much to trust the figure.
      from:
        `There is no official list, so we combine ${nameList(MLD_DETECTION.methods)}. ` +
        `Between them they name ${MLD_DETECTION.basis}.`,
      // Guarded on the ASSEMBLED string rather than on the array's length: `knownMisses` is a
      // `const` tuple, so comparing its length to 0 is a comparison TypeScript can prove false
      // and refuses to compile. If the list is ever emptied this reads as null rather than as
      // "We miss , which wreck…".
      misses: mldMisses
        ? `We miss ${mldMisses}, which wreck everyone's lands without saying so in words we ` +
          `can match.`
        : null,
    },
    extraTurns: {
      from: `We read the rules text: ${EXTRA_TURN_DETECTION.basis}.`,
      // Not measured from a constant, and it is not a coverage figure: a single card looping on
      // itself is a shape the classifier does not attempt, rather than one it attempts and gets
      // wrong. `probe:bracket` pins that the loop clause needs an ASSEMBLED combo.
      misses: "We miss turns made by one card looping on itself, like Nexus of Fate.",
    },
    combos: {
      from: `We use ${COMBO_DETECTION.basis}.`,
      misses:
        "We miss combos needing three or more cards, and ones that only work with a " +
        "particular printing.",
    },
    why:
      "If someone at the table disagrees with your bracket, the argument is usually about one " +
      "of these four. Knowing which one we are least sure of is how you settle it.",
  },
} as const;

/**
 * A small count as a word. "one game changer", not "1 game changer".
 *
 * PROSE, NOT DATA. A figure a reader is meant to weigh stays a numeral — every count on the
 * verdict block does, and its denominator with it. This is for a count inside a SENTENCE,
 * where a digit reads as a field someone forgot to format.
 *
 * It gives up past twelve and hands back the numeral, which is the ordinary typographic line
 * and the point where a word stops being easier to read than a digit.
 */
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
] as const;

export function numberWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

/**
 * "1st", "2nd", "3rd", "4th" — for "that would be your 4th game changer".
 *
 * US English, which is the app's throughout. The teens are the exception every naive
 * implementation gets wrong: 11, 12 and 13 take `th` despite ending in 1, 2 and 3, and they
 * are reachable here — a deck can hold eleven game changers.
 */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
