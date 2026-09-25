import type { DeckProfile } from "../profile/types";
import { producesInfiniteTurns } from "../spellbook/combo-features";
import {
  COMBO_POLICY,
  GAME_CHANGER_LIMIT,
  MASS_LAND_DENIAL_LIMIT,
  comboLandsEarly,
  permitsFor,
  violationsFor,
} from "./rules";
import type {
  Bracket,
  BracketLean,
  BracketLimitReport,
  BracketVerdict,
  CardRef,
  ComboRef,
  Violation,
} from "./types";

/**
 * Which brackets a deck is PERMITTED, with every receipt behind the answer.
 *
 * A pure function over the profile — no reads, no clock. The whole ruling this feature
 * turns on is here in one line each: the app never produces a single power number, so the
 * answer is a RANGE, and a player's own declaration is reported beside it and never
 * corrected, inferred or defaulted.
 *
 * THE SLOT IS THE LOWEST SATISFIED BRACKET. See `permitsFor`.
 */
export function slotDeck(
  profile: DeckProfile,
  /**
   * What the player told us — handed in AT THE DRAW rather than read off the profile.
   *
   * It is not a property of the deck's cards, and the profile is a cached document keyed on
   * a fingerprint over them. Carrying it there meant one declaration retired the whole cache
   * and rebuilt the flags, combos, staples, composition and population — 630ms median, 2.2s
   * on the largest deck — to recompute figures that are identical either side of the press.
   * Here it costs nothing: this function is pure, and these are the only two lines that read
   * it.
   *
   * NEVER inferred and never defaulted. The default is null because "not asked" is the
   * honest absence, not because any caller may omit an answer the player gave.
   */
  declared: Bracket | null = null,
): BracketVerdict {
  const b = profile.brackets;
  const gc = b.gameChangers;
  const mld = b.massLandDenial;
  const turns = b.extraTurns;
  const combos = b.twoCardCombos;

  // A LOOP, by Spellbook's own measured data rather than by reading a card. This is the one
  // extra-turns clause that violates above bracket 1, and the combo is the receipt.
  const loops = combos.filter((c) => producesInfiniteTurns(c.produces));

  const { violatesB1, violatesB2, violatesB3 } = violationsFor({
    gameChangers: gc.length, massLandDenial: mld.length, extraTurns: turns.length,
    combos: combos.length, loops: loops.length,
  });

  // The 3-vs-4 boundary resolves on whether the deck can ASSEMBLE a combo rather than draw
  // into it. A commander piece counts as covered without a tutor — it is available every
  // game by the format's own rules.
  const assemblesCombo = comboLandsEarly(
    combos,
    profile.brackets.comboReach.reaches,
    profile.commanderOracleIds,
  );

  const permits = permitsFor({ violatesB1, violatesB2, violatesB3, assemblesCombo });

  const comboCards = (list: ComboRef[]): CardRef[] =>
    [...new Map(list.flatMap((c) => c.cards).map((c) => [c.oracleId, c])).values()];

  const violations: Violation[] = [];
  const add = (v: Violation) => {
    if (v.have > v.limit) violations.push(v);
  };

  for (const bracket of [1, 2, 3] as const) {
    const limit = GAME_CHANGER_LIMIT[bracket];
    add({ rule: "gameChangers", bracket, cards: gc, have: gc.length, limit });
    add({
      rule: "massLandDenial",
      bracket,
      cards: mld,
      have: mld.length,
      limit: MASS_LAND_DENIAL_LIMIT,
    });
    if (COMBO_POLICY[bracket] === "forbidden") {
      add({
        rule: "twoCardCombos",
        bracket,
        cards: comboCards(combos),
        combos,
        have: combos.length,
        limit: 0,
      });
    }
    if (bracket === 1) {
      add({ rule: "extraTurns", bracket, cards: turns, have: turns.length, limit: 0 });
    } else if (loops.length > 0) {
      // The loop clause. Reported at 2 as well as 3 even though B2's combo rule has already
      // caught the same deck, because deleting the redundant half is how the B3 half — the
      // one that bites — gets deleted with it.
      add({
        rule: "extraTurns",
        bracket,
        cards: comboCards(loops),
        combos: loops,
        have: loops.length,
        limit: 0,
      });
    }
  }

  const limitsFor = (bracket: 1 | 2 | 3): BracketLimitReport => ({
    bracket,
    gameChangers: {
      have: gc.length,
      limit: GAME_CHANGER_LIMIT[bracket],
      violated: gc.length > GAME_CHANGER_LIMIT[bracket],
      cards: gc,
    },
    massLandDenial: { have: mld.length, violated: mld.length > 0, cards: mld },
    extraTurns:
      bracket === 1
        ? { counted: true, have: turns.length, violated: turns.length > 0, cards: turns }
        : {
            counted: false,
            have: turns.length,
            cards: turns,
            loopCombos: loops,
            violated: loops.length > 0,
          },
    twoCardCombos:
      COMBO_POLICY[bracket] === "forbidden"
        ? { policy: "forbidden", have: combos.length, violated: combos.length > 0, combos }
        : { policy: "earlyGameOnly", have: combos.length, combos },
  });

  return {
    permits,
    declared,
    declaredOutsidePermits: declared !== null && !permits.includes(declared),
    lean: leanFor(profile, permits, combos),
    limits: { bracket1: limitsFor(1), bracket2: limitsFor(2), bracket3: limitsFor(3) },
    violations,
    // Reported and refused a score: extra turns above bracket 1 are about CHAINING, which a
    // decklist cannot answer.
    unquantified: { extraTurns: permits.includes(1) ? [] : turns },
    detection: b.detection,
  };
}

/**
 * WHY the combo boundary landed where it did.
 *
 * This was the `[3, 4]` lean — advice on a range the reader had to settle. Since the range
 * was overturned (2026-09-20) it is the REASON for a resolved verdict instead: `reachable`
 * means the deck's tutors can assemble a whole combo and it slotted at 4; `drawOnly` means
 * they cannot and it stayed at 3.
 *
 * It is drawn wherever a combo is present and the game-changer count did not already decide
 * the bracket, because that is exactly where a reader is owed the reasoning — the verdict
 * moved on a judgement rather than on a count, and §2.2 says a judgement without its cards is
 * the thing this feature exists to avoid. The receipts name the combo and every tutor behind
 * it.
 */
function leanFor(
  profile: DeckProfile,
  permits: readonly number[],
  combos: ComboRef[],
): BracketLean | null {
  // Only where the combo clause was what decided it: a deck already past B3 on game changers
  // or mass land denial reads [4, 5], and its bracket owes nothing to any tutor.
  const decidedByCombo =
    combos.length > 0 && permits.length === 1 && (permits[0] === 3 || permits[0] === 4);
  if (!decidedByCombo) return null;

  // Grouped by PIECE, from the association the profile already carries. `reaches` is
  // `{ tutor, combo, piece }`; the previous shape threw `piece` away while deduping tutors, so
  // the modal had to ask "what finds this half?" of a list that had forgotten which half each
  // tutor was found for.
  const receipts = combos.map((combo) => {
    const forCombo = profile.brackets.comboReach.reaches.filter(
      (r) => r.combo.variantId === combo.variantId,
    );
    // Every piece of the combo gets a row, including the ones nothing finds: a half with no
    // tutor is exactly what the `drawOnly` reading is about, and omitting it would leave the
    // modal drawing a combo that looks wholly covered.
    const pieces = combo.cards.map((piece) => ({
      piece,
      tutors: [
        ...new Map(
          forCombo
            .filter((r) => r.piece.oracleId === piece.oracleId)
            .map((r) => [r.tutor.oracleId, r.tutor]),
        ).values(),
      ],
    }));
    return { combo, pieces };
  });

  const reachable = permits[0] === 4;
  // THE DECIDING COMBO, through the same predicate that decided the bracket rather than a
  // second copy of it: `comboLandsEarly` answers "can the deck assemble ANY of these", and the
  // one it answers `true` for is the one the verdict rests on. Re-asking it per combo keeps
  // one rule; writing the coverage test again here is how two copies drift.
  const decidedBy = reachable
    ? (combos.find((combo) =>
        comboLandsEarly([combo], profile.brackets.comboReach.reaches, profile.commanderOracleIds),
      ) ?? null)
    : null;
  return {
    likely: reachable ? 4 : 3,
    reason: reachable ? "reachable" : "drawOnly",
    decidedBy,
    receipts,
  };
}
