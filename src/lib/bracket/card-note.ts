// Which sentences a candidate's card note draws — the whole rule, in one pure function.
//
// PURE and client-safe. It takes the facts rather than reading them: `loadCandidateFacts`
// fetches a whole pool in one statement (8a), and this decides what to say about one row of
// it. Nothing here touches a deck profile, `bracketDelta`, or any figure that would have to be
// recomputed — that is the point of the note, not an optimisation of it.
//
// THE RULE IT ENFORCES. A note states what the CARD is and what the RULES say about that kind.
// It never states, implies or predicts the deck's standing. "Your bracket" is only ever the
// bracket the player DECLARED; with no declaration the deck clause is absent entirely and the
// note prints the card fact and the rules fact and stops. It never falls back to the last
// determined verdict, which may be four edits old with nothing on the row to say so.
//
// NO COMPONENT MAY RE-DERIVE THIS. Two surfaces draw the note today — the Consider tile and
// the top-off row — and the quick-add result row joins them in PR 8c. A second copy of the
// order, the cap or the declared/undeclared branch in any of them is how `probe:build-from`
// spent three rounds drifting from `loadAvailability`.
//
// STATE COVERAGE. `STATES-card-note.md` §A names n1-n9; this covers n1-n7 and n9. n8 — the
// combo completion — is transcribed in the copy module and deliberately not drawn, because
// combo awareness shipped the same statement on the same rows first. The reasoning is in
// `src/lib/copy/card-note.ts` and in the surface plan.

import { cardNote } from "../copy/card-note";
// `ordinal` rather than a second implementation: the teens are the case every naive
// version gets wrong, a deck can hold eleven game changers, and two formatters drift.
import { ordinal as ordinalOf } from "../copy/deck-analysis";
import { GAME_CHANGER_LIMIT } from "./rules";
import type { Bracket } from "./types";
import type { CandidateFacts } from "./delta";

/**
 * How many of each kind the deck's CURRENT list already holds.
 *
 * Tutors are counted here and are not a `CardFact`: the three marks are Round 1's and tutors
 * are Round 2 design, so the count comes off the deck read's own classification rather than
 * off the marks. One classifier (`classifyTutor`) answers for the deck and for the candidate,
 * so a card's reading cannot differ depending on which side of the add it is on.
 */
export type NoteCounts = {
  gameChanger: number;
  /**
   * `null` where the DECK's flags read failed — unknown, and not the same claim as zero.
   *
   * These two kinds are the only ones that come off `card_bracket_flags`; a game changer is a
   * column on `cards` and a tutor is read off oracle text, so both survive that failure. The
   * candidate's own facts come from a SEPARATE flags read, which can succeed while this one
   * fails — and then a card correctly detected as mass land denial would be introduced as
   * `your 1st` to a deck already holding three. An ordinal is a count, and a count nobody has
   * is not zero.
   */
  massLandDenial: number | null;
  extraTurns: number | null;
  tutor: number;
};

export const EMPTY_NOTE_COUNTS: NoteCounts = {
  gameChanger: 0,
  massLandDenial: 0,
  extraTurns: 0,
  tutor: 0,
};

/**
 * `row` is the sentence, `tile` is the clause.
 *
 * The cap is on FACTS, not on sentences: `STATES-card-note.md` §A caps a row at two facts and
 * a tile at one, and the mass-land-denial note is one fact carrying two sentences.
 */
export type NoteDensity = "row" | "tile";

const FACT_CAP: Record<NoteDensity, number> = { row: 2, tile: 1 };

/**
 * The declaration, narrowed to the three brackets that HAVE limits — the domain every limits
 * table in `rules.ts` is keyed on.
 *
 * Null covers both "unanswered" and "declared 4 or 5", which are different states of the
 * declaration and the same state of the rules: there is no allowance to quote either way, so
 * the note takes its flat form. Written once rather than at each call site, because a
 * `declared <= 3` repeated per fact is three chances to get the boundary wrong.
 */
function limitedBracket(declared: Bracket | null): 1 | 2 | 3 | null {
  return declared === 1 || declared === 2 || declared === 3 ? declared : null;
}

export type CardNoteInput = {
  /** Null where the facts read failed or the card carries none. Draws nothing either way. */
  facts: CandidateFacts | null;
  /** `decks.declared_bracket`. Null is UNANSWERED and means nothing else. */
  declared: Bracket | null;
  counts: NoteCounts;
  density: NoteDensity;
  /**
   * The candidate is already a row in the deck, so the deck's count already includes it and
   * the ordinal is its own position rather than the position it would take. The Consider tile
   * draws in-deck cards; the top-off list does not.
   */
  inDeck?: boolean;
};

/**
 * The sentences, in `STATES-card-note.md` §A's order, already capped. Empty where nothing
 * renders — n9, and the state a failed facts read degrades to. **Never a reserved height.**
 */
export function cardNoteSentences({
  facts,
  declared,
  counts,
  density,
  inDeck = false,
}: CardNoteInput): string[] {
  if (!facts) return [];

  const cap = FACT_CAP[density];
  // A kind whose count is UNKNOWN draws no sentence at all — see `NoteCounts`. The card fact
  // is still true and the rules clause is still quotable, but every one of these sentences
  // carries an ordinal, and there is no shipped form of them without it.
  // The ordinal counts the card itself. Adding it makes it the next of its kind; a card
  // already sleeved is counted where it already sits, because the note is then a statement
  // about the copy in the list rather than about an add.
  const nth = (held: number) => ordinalOf(held + (inDeck ? 0 : 1));

  const out: string[] = [];
  let drawn = 0;
  const take = (...sentences: string[]) => {
    if (drawn >= cap) return;
    drawn += 1;
    out.push(...sentences);
  };

  if (facts.gameChanger) {
    // A LIMIT EXISTS ONLY AT 1, 2 AND 3. `GAME_CHANGER_LIMIT` is keyed on those three alone,
    // and at a declared 4 or 5 there is no allowance to quote — so the note takes the flat
    // form, exactly as extra turns do up there. Quoting a limit that does not exist is the
    // defect audit 6 caught on the withdrawn push line, arriving from the other direction.
    const limited = limitedBracket(declared);
    take(
      limited !== null
        ? cardNote.gameChanger.declared(nth(counts.gameChanger), limited, GAME_CHANGER_LIMIT[limited])
        : cardNote.gameChanger.plain(nth(counts.gameChanger)),
    );
  }

  if (facts.massLandDenial && counts.massLandDenial !== null) {
    // The disclaimer rides with the sentence rather than being a fact of its own: it is the
    // second half of one attributed claim, and `STATES-card-note.md` caps facts rather than
    // sentences for this reason. It is also what makes the tile's "two short sentences" reach
    // the tile without anyone inventing a shortened string.
    const limited = limitedBracket(declared);
    take(
      // "including the Optimized you declared" is FALSE at 4 and 5, which have no limits at
      // all. The flat clause stays true at every bracket, so that is what those take.
      limited !== null
        ? cardNote.massLandDenial.declared(limited)
        : cardNote.massLandDenial.plain,
      cardNote.massLandDenial.disclaimer,
    );
  }

  if (facts.extraTurn && counts.extraTurns !== null) {
    const n = nth(counts.extraTurns);
    take(
      declared === null || declared >= 4
        ? // Brackets 4 and 5 state no extra-turn rule, so there is nothing to quote. n6.
          cardNote.extraTurns.plain(n)
        : declared === 1
          ? // Exhibition is the one bracket that counts them, and it allows none.
            cardNote.extraTurns.forbidden(declared, n)
          : // Core and Upgraded: the rule is about chaining, which a list cannot show.
            cardNote.extraTurns.chaining(declared, n),
    );
  }

  if (facts.tutor) {
    // NO TUTOR GATE (§5, locked). A fact and never a limit, at every bracket and with or
    // without a declaration — so this branch does not read `declared` at all.
    take(cardNote.tutor(nth(counts.tutor)));
  }

  return out;
}
