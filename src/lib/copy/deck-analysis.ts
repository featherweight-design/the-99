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

/** "Wave of Vitriol and Cataclysm" — an Oxford-free list, because these are read aloud. */
function nameList(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const mldMisses = nameList(MLD_DETECTION.knownMisses);

export const deckAnalysisCopy = {
  brackets: BRACKET_NAMES,

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
      from:
        `There is no official list, so we read the rules text against ` +
        `${MLD_DETECTION.sources} community-maintained ones. Between them they name ` +
        `${MLD_DETECTION.basis}.`,
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
