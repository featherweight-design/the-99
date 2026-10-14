/**
 * The 99 — card note + verdict copy, Round 4 of 5 (R1).
 *
 * §4.1's premise is WITHDRAWN (Hugh, 2026-09-21): a deck's standing is determined only when the
 * player asks or commits. Destination: `src/lib/copy/card-note.ts` and `src/lib/copy/verdict.ts`.
 *
 * Imports `bracketPhrase` and `nameList` rather than re-declaring them. No em dashes in
 * shipping strings.
 *
 * THE ONE RULE THESE STRINGS ENFORCE: a card note states what the CARD is and what the RULES
 * say. It never states, implies or predicts the deck's standing. "Your bracket" is only ever
 * the bracket the player DECLARED, and with no declaration the clause is absent entirely.
 *
 * REGISTER. Game Changer membership is a list lookup and is stated flat. Mass land denial and
 * extra turns are read off oracle text and are ATTRIBUTED to us. The rules clause stays flat in
 * both: what is uncertain is whether the card is that kind of card, never what a bracket allows.
 * Hedging the certain claims too would teach the reader that our hedges are decoration.
 */

import { bracketPhrase, nameList, ordinal } from "@/lib/copy/shared";

export const cardNote = {
  /** The one label the slot wears, on every surface and every fact. */
  label: "About this card",

  /** Register 1 — flat. Membership, a count, and quoted rules text. */
  gameChanger: {
    plain: (n: string) => `A game changer, and your ${n}.`,
    declared: (n: string, declared: number, limit: number) =>
      limit === 0
        ? `A game changer, and your ${n}. ${bracketPhrase(declared)} allows none.`
        : `A game changer, and your ${n}. ${bracketPhrase(declared)} allows ${limit}.`,
  },

  /**
   * Register 2 — attributed. "We read this as" is checkable; "possibly" is doubt with no author
   * and no remedy. The final clause of `declared` is the only place the app admits a reading can
   * be wrong without pretending the rules might be.
   */
  massLandDenial: {
    plain: "We read this as mass land denial, which no bracket with limits allows.",
    declared: (declared: number) =>
      `We read this as mass land denial, which no bracket with limits allows, including the ${bracketPhrase(declared)} you declared.`,
    /** Appended on the add surfaces where the row has room for it. */
    disclaimer: "If that's wrong for how you play it, the reading is ours, not the rules'.",
  },

  /**
   * Extra turns. Only brackets 1, 2 and 3 say anything; at a declared 4 or 5 there is no clause
   * to quote, so `plain` is used.
   */
  extraTurns: {
    plain: (n: string) => `We read this as an extra-turn card, your ${n}.`,
    forbidden: (declared: number, n: string) =>
      `We read this as an extra-turn card, your ${n}. ${bracketPhrase(declared)} allows none.`,
    chaining: (declared: number, n: string) =>
      `We read this as an extra-turn card, your ${n}. ${bracketPhrase(declared)}'s rule is about chaining them, which a list can't show, so we count them and stop there.`,
  },

  /** Tutors. NO TUTOR GATE (§5, locked). A fact and never a limit. */
  tutor: (n: string) =>
    `A tutor, and your ${n}. No bracket limits how many you play.`,

  /**
   * A candidate that completes a combo the list already half-holds. Flat: both cards are in the
   * list, so this is determinate. It states the event and stops -- whether it moves the deck's
   * standing is the verdict's business, and the verdict is not running.
   */
  completesCombo: (a: string, b: string) =>
    `This completes ${a} + ${b}, a two-card infinite.`,

  /** No fact: nothing renders. The absence is the design. */
  none: null,
};

export const verdictBlock = {
  /** v1 -- never determined. The invitation, not an error and not an empty state. */
  neverDetermined: {
    eyebrow: "This deck has not been analysed",
    line: "Your cards decide which brackets this deck can sit in. One pass over all 99 and we'll tell you which.",
    action: "Analyse this deck",
    cost: "about two seconds",
  },

  /** v2 / v3 -- THE SAME SENTENCE. Only provenance differs. */
  determined: (range: string) => `Your cards permit ${range}.`,
  askedProvenance: (total: number, ago: string) =>
    `determined against all ${total} ${"\u00b7"} ${ago}`,
  committedProvenance: (version: string, total: number, date: string) =>
    `determined for ${version} ${"\u00b7"} all ${total} ${"\u00b7"} ${date}`,
  reanalyse: "Analyse again",
  running: "Reading all 99\u2026",

  /**
   * v4 -- stale. Round 0's form transfers; its reasoning does not. Round 0 could write "recounted
   * just now" beside a stale sentence because the figures were live. NOTHING RECOUNTS NOW, so the
   * counterweight is the control, and the verb carries what the tag cannot.
   */
  stale: {
    /** Past tense. The cheapest honest signal, and it works before the tag is read. */
    sentence: (range: string) => `Your cards permitted ${range}.`,
    tag: "out of date",
    provenance: (was: number, total: number, changed: number) =>
      `determined against ${was} of these ${total} ${"\u00b7"} ${changed} ${changed === 1 ? "card has" : "cards have"} changed since`,
    changedHeading: "The cards that changed",
    /**
     * A CARD claim about the changed cards, which is why it is allowed on a stale block. It must
     * never estimate whether the verdict would move -- that would be a verdict computed on the
     * sly to decide whether to admit the verdict is old.
     */
    changedCarryFacts: (n: number) =>
      `${n} of these carry facts the brackets count.`,
  },

  /** The tab label's accessible name when the dot is present. The dot itself is decorative. */
  tabNotCurrent: "Analysis, not up to date",

  /** Round 0's live-region string, unchanged. One message per settle. */
  announce: (range: string) => `Analysis ready. Your cards permit ${range}.`,
};

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
 * · "4 cards changed -- your bracket may have       a guess at whether the edits mattered.
 *    moved."
 * · "Analyse?" after N edits.                       the app picking the moment the player is
 *                                                   supposed to care. The ruling is that they pick.
 * · A second verdict phrasing for committed decks.  implies the app knows something different
 *                                                   about a version than about the same 99 cards.
 */
