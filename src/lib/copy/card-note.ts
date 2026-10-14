// The card note — what a candidate card IS, and what the rules say about that kind.
//
// Transcribed from `design/design_handoff_the99_push_line/card-note - copy strings.ts`
// (Round 4 of 5, R1), with `ERRATA-eng.md`'s defect 2 applied in the same commit as the
// transcription rather than swept afterwards. Only the `cardNote` half of that module lands
// here; its `verdictBlock` half belongs to the verdict block, which is a different PR, and the
// errata's defects 1 and 3 live entirely in that half and travel with it.
//
// THE ONE RULE THESE STRINGS ENFORCE, and the reason this module exists at all: a card note
// states what the CARD is and what the RULES say. It never states, implies or predicts the
// deck's standing. "Your bracket" is only ever the bracket the player DECLARED, and with no
// declaration the clause is absent entirely. That is Hugh's 2026-09-21 ruling — standing is
// determined only on ask or on commit — and it is what the push line these rows used to be
// planned for could not satisfy.
//
// REGISTER, AND WHY IT IS SPLIT. Game Changer membership is a list lookup and is stated flat.
// Mass land denial and extra turns are read off oracle text and are ATTRIBUTED to us. The rules
// clause stays flat in both: what is uncertain is whether the card is that kind of card, never
// what a bracket allows. Hedging the certain claims too would teach the reader that our hedges
// are decoration, at which point the hedge on the two that need it stops working.
//
// THREE ERRATA FIXES, all defect 2's family, all in this commit:
//
//   1. The drop imports `{ bracketPhrase, nameList, ordinal }` from `@/lib/copy/shared`, which
//      does not exist. The helpers live in `./deck-analysis`, and shipped copy modules in this
//      directory import each other relatively. That is `ERRATA-eng.md` §2 verbatim.
//   2. `nameList` and `ordinal` are then UNUSED here — the drop's own strings take the ordinal
//      pre-formatted as `n: string`, so `ordinal` is the caller's to apply and `nameList` is
//      never reached. Importing either would fail lint. The errata names `numberWord` as the
//      one to drop; two more go with it, for the same reason and by the same reading.
//   3. `bracketPhrase` takes `readonly Bracket[]`, and every call in the drop passes a bare
//      number. Wrapped at each call site rather than by adding a second overload: one bracket
//      is a one-member permitted set, which is what the helper already says.

import { bracketPhrase } from "./deck-analysis";
import type { Bracket } from "../bracket/types";

/** `bracketPhrase` is the permitted-set helper; a declaration is a set of one. */
const declaredName = (declared: Bracket) => bracketPhrase([declared]);

export const cardNote = {
  /** The one label the slot wears, on every surface and every fact. */
  label: "About this card",

  /** Register 1 — flat. Membership, a count, and quoted rules text. */
  gameChanger: {
    plain: (n: string) => `A game changer, and your ${n}.`,
    declared: (n: string, declared: Bracket, limit: number) =>
      limit === 0
        ? `A game changer, and your ${n}. ${declaredName(declared)} allows none.`
        : `A game changer, and your ${n}. ${declaredName(declared)} allows ${limit}.`,
  },

  /**
   * Register 2 — attributed. "We read this as" is checkable; "possibly" is doubt with no author
   * and no remedy. The final clause of `declared` is the only place the app admits a reading can
   * be wrong without pretending the rules might be.
   */
  massLandDenial: {
    /**
     * THE CONSEQUENCE, NOT THE ABSTRACTION. Ruled 2026-09-22, through `/copy-review`.
     *
     * The drop's clause was "which no bracket with limits allows" — true, and a rules fact
     * the reader has to convert into a fact about their deck. Mass land denial is the one
     * detection where that conversion needs NOTHING: it is forbidden outright at 1, 2 and 3,
     * so there is no threshold to compute and no dependence on the rest of the list. Where the
     * card puts you is therefore as knowable as the rules clause, and it is what a player
     * deciding whether to add it actually wants.
     *
     * NOT the same as the push line. "Adding this moves your permitted range" needs a live
     * verdict per candidate and was withdrawn on 2026-09-21; this needs none, because it is a
     * property of the CARD against the RULES and is true of every deck.
     *
     * It does not generalise to the other two, and is deliberately not applied to them. Extra
     * turns are counted at bracket 1 alone, so the consequence rules out one bracket of five
     * and takes more words than the current form. A game changer's consequence depends on the
     * COUNT, which is exactly the verdict the ruling removed.
     */
    plain: "We read this as mass land denial. Nothing below Optimized allows it.",
    /**
     * With a declaration, their own bracket is the more useful half of that sentence, so it
     * replaces the general rule rather than being appended to it. At a declared 4 or 5 the
     * flat form is used — there the rule is permission rather than a warning, and naming it
     * is still the honest reading.
     */
    declared: (declared: Bracket) =>
      `We read this as mass land denial. The ${declaredName(declared)} you declared doesn’t allow it.`,
    /**
     * Appended on the add surfaces where the row has room for it.
     *
     * THE TOP-OFF ROW, AND NOT THE CONSIDER TILE. The hedge is a fixed two-line cost and the
     * tile is 173px wide at 390, where it made this the only note on the surface drawing six
     * lines against every other note's three. The row draws it on one line above `md:`. Where
     * the hedge cannot fit, the marks now carry the same admission structurally: the glyph and
     * its key say a reading is present, the modal spells all three detections out in full, and
     * both name the detection as ours.
     */
    disclaimer: "If that’s wrong for how you play it, the reading is ours, not the rules'.",
  },

  /**
   * Extra turns. Only brackets 1, 2 and 3 say anything; at a declared 4 or 5 there is no clause
   * to quote, so `plain` is used.
   */
  extraTurns: {
    plain: (n: string) => `We read this as an extra-turn card, your ${n}.`,
    forbidden: (declared: Bracket, n: string) =>
      `We read this as an extra-turn card, your ${n}. ${declaredName(declared)} allows none.`,
    chaining: (declared: Bracket, n: string) =>
      `We read this as an extra-turn card, your ${n}. ${declaredName(declared)}’s rule is about chaining them, which a list can’t show, so we count them and stop there.`,
  },

  /** Tutors. NO TUTOR GATE (§5, locked). A fact and never a limit. */
  tutor: (n: string) => `A tutor, and your ${n}. No bracket limits how many you play.`,

  /**
   * A candidate that completes a combo the list already half-holds.
   *
   * TRANSCRIBED AND NOT DRAWN, deliberately, and this is the one place to read why. Combo
   * awareness (sub-project 3) shipped the same statement on the same two rows FIRST, as
   * the combo clause — drawn since 2026-09-22 as the lemniscate and the partner's name, with
   * the sentence spoken and a key entry glossing the glyph. Both hosts render it today
   * (`consider-combo.test.tsx`, `top-off-combo.test.tsx`). Drawing this sentence as well would
   * put two sentences about one combo on one row, and the shipped one is shorter and glossed.
   *
   * Kept here rather than dropped so a later reader of the handoff finds the string accounted
   * for rather than missing, and does not re-add it.
   */
  completesCombo: (a: string, b: string) => `This completes ${a} + ${b}, a two-card infinite.`,

  /** No fact: nothing renders. The absence is the design. */
  none: null,
} as const;

/**
 * WITHDRAWN, with reasons, so no one re-proposes them.
 *
 * · "It moves what your cards permit from X to Y."  on an add surface. The clause the ruling
 *                                                   removed. There is no live standing to move.
 * · "This may push your bracket."                   the same claim in softer clothes. "May" does
 *                                                   not turn a deck statement into a card one.
 * · "Possibly mass land denial."                    doubt with no author and no remedy.
 * · "We're 87% confident this is..."                invented precision over a boolean detection
 *                                                   whose error rate is unmeasured.
 * · A --warning or --danger card note.              the loudest signal on the least certain claim.
 * · The note citing the last determined verdict     a stale verdict quoted with nothing on the row
 *   when there is no declaration.                   to say how old it is. Worse than the per-add
 *                                                   verdict the ruling removed.
 */
