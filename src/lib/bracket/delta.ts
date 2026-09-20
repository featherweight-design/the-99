import type { DeckProfile } from "../profile/types";
import { producesInfiniteTurns } from "../spellbook/combo-features";
import { comboLandsEarly, GAME_CHANGER_LIMIT, permitsFor } from "./rules";
import { slotDeck } from "./slot";
import type { Bracket, CardRef, ComboRef, Violation } from "./types";

/**
 * What adding ONE card would do to a deck's bracket — the push check.
 *
 * Pure and cheap per row, because later sub-projects run it over every candidate in a list.
 */

export type CandidateFacts = {
  card: CardRef;
  gameChanger: boolean;
  massLandDenial: boolean;
  extraTurn: boolean;
  tutor: boolean;
  /** Variants the deck is one card away from, that THIS card closes. Computed as a diff of
   *  two runs of the same combo rule rather than a second predicate, so the two cannot
   *  drift. */
  completesCombos: ComboRef[];
};

/**
 * FOUR SHAPES, never blurred.
 *
 * They read alike in prose — "adding this changes the bracket" — and mean different things,
 * which is exactly why they are a discriminated union rather than one sentence with fields:
 *
 * · `moves`       — the permitted range changes, and a named rule with its receipts is why.
 * · `counts`      — the card counts against a limit. It may ALSO move the range (a fourth
 *                   Game Changer does), and the count is still the sentence a reader needs.
 * · `unquantified`— a fact the system reports and refuses to score, at a bracket that does
 *                   not count it. Never a move.
 * · `ruleless`    — a fact no bracket rule counts at all. Tutors, and only tutors.
 *
 * `from` and `to` are RANGES. The spec's own `[3] → [3,4]` widening cannot be written with
 * single brackets, and writing it as `3 → 4` would claim a slot the system does not assign.
 */
export type BracketDelta =
  | { kind: "moves"; from: Bracket[]; to: Bracket[]; rule: Violation }
  | {
      kind: "counts";
      rule: "gameChangers";
      now: number;
      limit: number;
      to: Bracket[];
      /**
       * Combos this candidate ALSO completes.
       *
       * Underworld Breach is a Game Changer that completes combos, and the precedence above
       * sends it here — so without the receipts a consumer is told "4 of 3" and has no way to
       * explain the rest of what the card did. The count is still the sentence; this is the
       * evidence underneath it.
       */
      combos: ComboRef[];
    }
  | { kind: "unquantified"; rule: "extraTurns"; now: number; bracket: Bracket }
  | { kind: "ruleless"; fact: "tutors"; now: number }
  | { kind: "none" };

export function bracketDelta(profile: DeckProfile, candidate: CandidateFacts): BracketDelta {
  const b = profile.brackets;
  const from = slotDeck(profile).permits;

  const gc = b.gameChangers.length + (candidate.gameChanger ? 1 : 0);
  const mld = b.massLandDenial.length + (candidate.massLandDenial ? 1 : 0);
  const turns = b.extraTurns.length + (candidate.extraTurn ? 1 : 0);
  const combos = [...b.twoCardCombos, ...candidate.completesCombos];
  const loops = combos.filter((c) => producesInfiniteTurns(c.produces));

  const to = permitsFor({
    violatesB1: gc > 0 || mld > 0 || turns > 0 || combos.length > 0,
    violatesB2: gc > 0 || mld > 0 || combos.length > 0,
    violatesB3: gc > GAME_CHANGER_LIMIT[3] || mld > 0 || loops.length > 0,
    // The candidate's own combo has no computed reach — nothing has asked which tutors find
    // a card that is not in the deck yet — so coverage is read from the tutors already here.
    // That errs toward "you would have to draw it", which is the direction this feature is
    // required to err in: telling a player their deck is gentler than it is, is the failure
    // §4.2 names as dangerous, and claiming an add pushed them to 4 on an uncomputed reach
    // would be the same error pointing the other way.
    assemblesCombo: comboLandsEarly(combos, b.comboReach.reaches),
  });

  const moved = from.join() !== to.join();

  // EXPLICIT PRECEDENCE, because one card fires several rules at once: Underworld Breach is
  // a Game Changer that also completes combos, and the four shapes must not blur into
  // whichever branch happened to be written first.

  // 1 · A move the candidate caused, attributed to the rule that caused it. A Game Changer
  //     is handled at step 2 even when it moves, because the COUNT is the sentence there.
  if (moved && !candidate.gameChanger) {
    const newLoops = candidate.completesCombos.filter((c) => producesInfiniteTurns(c.produces));
    if (candidate.massLandDenial) {
      return {
        kind: "moves", from, to,
        rule: { rule: "massLandDenial", bracket: 3, cards: [candidate.card], have: mld, limit: 0 },
      };
    }
    if (newLoops.length > 0) {
      // The LOOP clause, not the widening: a completed infinite-turns combo violates B3
      // outright where a generic infinite only opens the range to [3,4].
      return {
        kind: "moves", from, to,
        rule: {
          rule: "extraTurns", bracket: 3, cards: [candidate.card],
          combos: newLoops, have: loops.length, limit: 0,
        },
      };
    }
    if (candidate.completesCombos.length > 0) {
      return {
        kind: "moves", from, to,
        rule: {
          rule: "twoCardCombos", bracket: 2, cards: [candidate.card],
          combos: candidate.completesCombos, have: combos.length, limit: 0,
        },
      };
    }
    if (candidate.extraTurn) {
      // Reachable only from a range that still permits bracket 1, which is the one bracket
      // that COUNTS extra turns. Above it the same card is `unquantified`.
      return {
        kind: "moves", from, to,
        rule: { rule: "extraTurns", bracket: 1, cards: [candidate.card], have: turns, limit: 0 },
      };
    }
  }

  // 2 · A Game Changer counts, whether or not it moved. §7.2's own second example is a
  //     fourth Game Changer, and the sentence a reader needs there is "4 of 3", not "the
  //     range widened".
  if (candidate.gameChanger) {
    return {
      kind: "counts",
      rule: "gameChangers",
      now: gc,
      limit: GAME_CHANGER_LIMIT[3],
      to,
      combos: candidate.completesCombos,
    };
  }

  // 3 · An extra turn at a bracket that does not count them. Reported, never scored.
  if (candidate.extraTurn) {
    return { kind: "unquantified", rule: "extraTurns", now: turns, bracket: to[0] };
  }

  // 4 · A tutor. No bracket rule counts one, and saying so is the point — `unquantified`
  //     would imply a rule exists that we cannot measure, and `none` would hide the fact.
  if (candidate.tutor) {
    return { kind: "ruleless", fact: "tutors", now: profile.brackets.comboReach.tutors.length + 1 };
  }

  return { kind: "none" };
}
