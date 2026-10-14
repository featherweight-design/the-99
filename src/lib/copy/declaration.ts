// What the Analysis tab says about a player's own bracket: the ask, the answer, and the line a
// draft draws after its reading moves out of what was declared on it.
//
// Transcribed from `design_handoff_the99_declaration/declaration - copy strings.ts` (Round 3).
// Its OWN MODULE rather than more keys on `deckAnalysisCopy`, because the verdict's findings and
// its modal are landing in that file in parallel, and the declaration is a surface of its own:
// the first thing on the tab a player can change.
//
// Rules this block is written under, all of them Round 3's:
//
//   · A bracket is named by NAME ALONE. Every string below is drawn beside that bracket's mark,
//     and the mark is the numeral — "Optimized (4)" would print it twice.
//   · The app NEVER QUOTES THE PLAYER. No "you said", no "your changes", no "change what you
//     said". A declaration is a statement of record about one deck state, and it is never stale,
//     because it was never a claim about any other.
//   · THERE IS NO SKIP. Two chips are the entire control, so there is no "skipped" string, no
//     "say which", and nothing to store for a refusal.
//
// NO EM DASH, which is this repo's rule for shipping strings: the handoff's `permitsBelow` joins
// its clauses on one, and the colon here is the same join every other verdict string makes.

import type { Bracket } from "../bracket/types";
import { BRACKET_NAMES } from "./deck-analysis";

export const declarationCopy = {
  ask: {
    /** Round 0's line, verbatim. Round 3 keeps Round 0's WORDS and Round 2's PLACE. */
    lead: "Pick one so pods know what to expect.",
    /** The group's accessible name. The chips' own labels are the bracket names alone. */
    groupAria: "Declare this deck's bracket",
  },

  declared: {
    /**
     * A statement of record, scoped to the deck state it was made on.
     *
     * `for version n` ONLY once a commit exists to name. On a draft the clause is omitted:
     * naming a version the draft is not is the error Round 3's R5 made in prose.
     */
    line: (declared: Bracket, version: number | null) =>
      version === null
        ? `Declared ${BRACKET_NAMES[declared]}.`
        : `Declared ${BRACKET_NAMES[declared]} for version ${version}.`,
    /** Inline at the end of that sentence. One word, and deliberately not "change what you said". */
    change: "change",
    /**
     * The description line once answered: the permitted range moves here rather than vanishing.
     *
     * `[1,2]` and `[4,5]` differ in why they are two. The top pair shares every card limit; the
     * bottom pair is split by one (extra turns), so "no card limits between them" would be false
     * there — the R1 audit's correction.
     */
    permitsBelow: (permits: readonly Bracket[]) => {
      const phrase = permits.map((b) => BRACKET_NAMES[b]).join(" or ");
      return permits[0] >= 4
        ? `Your cards permit ${phrase}: the two have no card limits between them.`
        : `Your cards permit ${phrase}: the two differ in what you are trying to do.`;
    },
  },

  /**
   * The DRAFT has moved out of what was declared on it (§A5).
   *
   * PASSIVE ON PURPOSE. "was declared" reports the record; "you said" would put the sentence back
   * in the player's mouth. And the superseded answer is STATED rather than deleted: a
   * declaration vanishing unexplained is worse than being asked again. No control of its own.
   */
  draftMovedOut: {
    line: (declared: Bracket) =>
      `${BRACKET_NAMES[declared]} was declared, and this deck has since moved out of it.`,
  },

  /**
   * A COMMITTED version that reads differently from the last one (§E). It replaces the whole
   * earlier drift block, whose "you said", "moved past" and "change what you said" existed to
   * soften a claim the app should never have made — that a statement had gone out of date.
   *
   * What is left is a diff: one sentence, no direction, no control, no second person. Cardinality
   * picks the verb — a range PERMITS, a single bracket READS AS.
   */
  versionChange: {
    markLabelPrevious: (version: number) => `version ${version}`,
    markLabelCurrent: "this version",
    line: (
      current: { phrase: string; isRange: boolean },
      previous: { version: number; phrase: string; declared: Bracket | null },
    ) => {
      const now = current.isRange
        ? `This version permits ${current.phrase}.`
        : `This version reads as ${current.phrase}.`;
      const then =
        previous.declared === null
          ? `Version ${previous.version} read as ${previous.phrase}.`
          : `Version ${previous.version} read as ${previous.phrase} and was declared `
            + `${BRACKET_NAMES[previous.declared]}.`;
      return `${now} ${then}`;
    },
  },

  /** What the ask says when the write is refused. The house form: true whether the refused
   *  write was a first answer or a change, where the previous answer is put back. */
  refused: "We couldn’t save that. Your answer is unchanged.",
} as const;
