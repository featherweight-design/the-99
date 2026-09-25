import type { DeckProfile } from "../profile/types";
import { producesInfiniteTurns } from "../spellbook/combo-features";
import { comboLandsEarly, GAME_CHANGER_LIMIT, permitsFor, violationsFor } from "./rules";
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
 * · `ruleless`    — a fact no bracket LIMIT counts. Tutors, and only tutors — and note that since
 * 2026-09-20 a tutor can still decide the 3-vs-4 boundary by covering a combo, which is a
 * different thing from being counted against a limit. No rule anywhere says "too many".
 *
 * `from` and `to` are RANGES. A `[3] → [4]` resolution cannot be written with
 * single brackets, and writing it as `3 → 4` would claim a slot the system does not assign.
 */
export type BracketDelta =
  | { kind: "moves"; from: Bracket[]; to: Bracket[]; rule: Violation }
  | {
      kind: "counts";
      rule: "gameChangers";
      now: number;
      /**
       * The bracket whose allowance is the one that BITS, and its figure.
       *
       * `limit` used to be bracket 3's always, so a deck losing Exhibition on its FIRST Game
       * Changer read "your 1st game changer, and Upgraded allows 3" — naming a limit it was
       * nowhere near and staying silent about the one it had just crossed. The binding
       * bracket is the lowest the deck's current reading still permits, which is the one
       * whose allowance the count is measured against.
       *
       * Null above bracket 3: nothing there states a Game Changer allowance at all, so
       * there is no figure to name and the sentence says so instead.
       */
      bindingBracket: Bracket | null;
      limit: number | null;
      /** The reading before the add, so a row can draw the pair without a second verdict. */
      from: Bracket[];
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
  | {
      kind: "ruleless";
      fact: "tutors";
      now: number;
      /**
       * Whether the deck's tutors ALREADY cover a whole combo.
       *
       * The sentence branches on it, and without the field it cannot: "your tutors can't
       * find every piece of a combo this deck holds — yet" is false of a deck reading `[4]`,
       * which is exactly a deck whose tutors can. A tutor added there is still `ruleless`,
       * and the clause asserting an absence would be asserting one that is not there.
       */
      coversACombo: boolean;
    }
  /**
   * A combo COMPLETED, moving nothing.
   *
   * The sixth shape, and the one the round was chartered to add. Adding a piece that finishes
   * a two-card combo, to a deck whose tutors cannot assemble it, moves the permitted range by
   * nothing — so `none` would have been returned and the reader told nothing at the moment
   * they put a combo in their deck. A silence that follows a real event is the worst reading
   * available.
   *
   * It is a shape of its own rather than a widening of `none`, because the union exists so
   * these do not blur: `none` is a drawn absence and this is a drawn event.
   */
  | { kind: "inert"; fact: "combo"; combos: ComboRef[]; to: Bracket[] }
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
    ...violationsFor({ gameChangers: gc, massLandDenial: mld, extraTurns: turns, combos: combos.length, loops: loops.length }),
    // The candidate's own combo has no computed reach — nothing has asked which tutors find
    // a card that is not in the deck yet — so coverage is read from the tutors already here.
    // That errs toward "you would have to draw it", which is the direction this feature is
    // required to err in: telling a player their deck is gentler than it is, is the failure
    // §4.2 names as dangerous, and claiming an add pushed them to 4 on an uncomputed reach
    // would be the same error pointing the other way.
    assemblesCombo: comboLandsEarly(combos, b.comboReach.reaches, profile.commanderOracleIds),
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
      // outright, where a generic infinite resolves the boundary on tutor coverage instead.
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
    // WHICH ALLOWANCE THE COUNT IS MEASURED AGAINST.
    //
    // If the card moved the reading, it is the limit the deck just CROSSED — the highest
    // bracket it no longer permits. A deck losing Exhibition and Core on its first Game
    // Changer is measured against Core's nought, not against the allowance of the bracket it
    // landed in: "your 1st game changer, and Upgraded allows 3" names a limit it is nowhere
    // near and stays silent about the one it crossed.
    //
    // If the card moved nothing, no limit was crossed, and the count is measured against the
    // bracket the deck sits in.
    //
    // Null above 3 either way: nothing there states a Game Changer allowance at all, so
    // there is no figure to name.
    const crossed = to[0] > from[0] ? to[0] - 1 : to[0];
    const bounded = crossed === 1 || crossed === 2 || crossed === 3 ? crossed : null;
    return {
      kind: "counts",
      rule: "gameChangers",
      now: gc,
      bindingBracket: bounded,
      limit: bounded === null ? null : GAME_CHANGER_LIMIT[bounded],
      from,
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
    return {
      kind: "ruleless",
      fact: "tutors",
      now: profile.brackets.comboReach.tutors.length + 1,
      // Asked of the deck as it stands, through the same predicate that decides the bracket
      // rather than a second copy of it.
      coversACombo: comboLandsEarly(
        b.twoCardCombos,
        b.comboReach.reaches,
        profile.commanderOracleIds,
      ),
    };
  }

  // 5 · A combo completed that moved nothing. AFTER the counted and reported facts, because
  //     those describe what the card IS; this describes what it did. A Game Changer that
  //     also completes a combo keeps its count and carries the combo on its own line.
  if (candidate.completesCombos.length > 0) {
    return { kind: "inert", fact: "combo", combos: candidate.completesCombos, to };
  }

  return { kind: "none" };
}
