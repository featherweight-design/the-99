import { describe, expect, it } from "vitest";

import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../profile/build";
import type { ComboRef, DetectionCoverage, FlagSource } from "../profile/types";
import { slotDeck } from "./slot";

const DETECTION: DetectionCoverage = {
  massLandDenial: { sources: 2, basis: "22 of 24 on a curated set" },
  extraTurn: { sources: 2, basis: "no misses among the 56" },
  twoCardCombos: { sources: 1, basis: "Spellbook's index" },
};

const card = (oracleId: string): ProfileCardRow => ({
  oracleId,
  name: oracleId,
  layout: "normal",
  typeLine: "Creature — Human",
  oracleText: null,
  keywords: [],
  cmc: 2,
  colorIdentity: [],
  manaCost: "{1}{G}",
  quantity: 1,
  commanderLegal: true,
});

const combo = (variantId: string, produces: string[], pieces = ["p1", "p2"]): ComboRef => ({
  variantId,
  cards: pieces.map((p) => ({ oracleId: p, name: p })),
  produces,
  bracketTag: "casual",
  usesCommander: false,
});

// The verdict is a pure function over a profile, so every case is built as a real profile
// rather than a hand-written object. A hand-written one can hold a state the builder cannot
// produce, and then the test proves something about a deck that cannot exist.
function verdict(over: Partial<ProfileInput> = {}) {
  const input: ProfileInput = {
    deckId: "d",
    fingerprint: "f",
    cards: [],
    commanderOracleIds: ["cmd"],
    identity: ["G"],
    declared: null,
    condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: null, identity: null, count: null },
    thinCondition: false,
    staples: [],
    commanderDeckCount: null,
    population: null,
    mldFlags: new Map<string, FlagSource[]>(),
    extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(),
    twoCardCombos: [],
    tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  };
  return slotDeck(buildDeckProfile(input));
}

describe("the permitted range", () => {
  // The lowest bracket is never silently floored: a clean deck permits 1 AND 2, because
  // nothing about it rules out the lower table.
  it("permits [1,2] on a clean deck", () => {
    expect(verdict().permits).toEqual([1, 2]);
  });

  it("permits [1,2] on an empty deck", () => {
    expect(verdict({ cards: [] }).permits).toEqual([1, 2]);
  });

  // The split a single shared rule gets wrong at one end: extra turns are COUNTED at 1 and
  // not at 2, so the same card violates one and not the other.
  it("permits [2] on extra turns alone", () => {
    const v = verdict({
      cards: [card("time-warp")],
      extraTurnFlags: new Map([["time-warp", ["oracle_rule"] as FlagSource[]]]),
    });
    expect(v.permits).toEqual([2]);
    expect(v.limits.bracket1.extraTurns).toMatchObject({ counted: true, violated: true });
    expect(v.limits.bracket2.extraTurns).toMatchObject({ counted: false, violated: false });
  });

  it("permits [3] at exactly three Game Changers and no combo", () => {
    const ids = ["gc1", "gc2", "gc3"];
    const v = verdict({ cards: ids.map(card), gameChangerIds: new Set(ids) });
    expect(v.permits).toEqual([3]);
    expect(v.limits.bracket3.gameChangers).toMatchObject({ have: 3, limit: 3, violated: false });
  });

  it("permits [4,5] at a fourth Game Changer, and names the excess", () => {
    const ids = ["gc1", "gc2", "gc3", "breach"];
    const v = verdict({ cards: ids.map(card), gameChangerIds: new Set(ids) });
    expect(v.permits).toEqual([4, 5]);
    const b3 = v.violations.find((x) => x.bracket === 3 && x.rule === "gameChangers");
    expect(b3).toMatchObject({ have: 4, limit: 3 });
    expect(b3!.cards.map((c) => c.oracleId)).toContain("breach");
  });

  // Lateness is not computable from a decklist, so B3's combo clause never VIOLATES. Ruled
  // 2026-09-20, it RESOLVES instead, on whether the deck's tutors can assemble the combo —
  // a range is only ever a question for the PLAYER, and this is a question about the deck.
  // (Two earlier readings are history: violating outright, which slotted every deck holding
  // one infinite as a 4; and widening to [3, 4], which shipped and was overturned.)
  it("permits [3] on a two-card infinite the deck can only draw into", () => {
    const v = verdict({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite mana"])],
    });
    expect(v.permits).toEqual([3]);
    expect(v.limits.bracket3.twoCardCombos).toMatchObject({ policy: "earlyGameOnly", have: 1 });
    expect(v.limits.bracket3.twoCardCombos).not.toHaveProperty("violated");
  });

  // The loop clause: an assembled combo Spellbook records as producing infinite TURNS is a
  // loop by measured data, and that violates B3 outright where a generic infinite widens.
  it("permits [4,5] when the assembled combo produces infinite turns", () => {
    const v = verdict({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite turns"])],
    });
    expect(v.permits).toEqual([4, 5]);
    const b3 = v.limits.bracket3.extraTurns;
    expect(b3).toMatchObject({ counted: false, violated: true });
    expect("loopCombos" in b3 && b3.loopCombos.map((c) => c.variantId)).toEqual(["v1"]);
  });

  it("an infinite-MANA combo does not trip the loop clause", () => {
    const v = verdict({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite colorless mana"])],
    });
    expect(v.permits).toEqual([3]);
    expect(v.limits.bracket3.extraTurns).toMatchObject({ violated: false });
  });

  // The boundary: can the deck ASSEMBLE the combo, or must it draw into it? The threshold is
  // the COMBO's own piece count, never a tutor count — "more than N tutors" is the clause
  // WotC deleted, and a number we chose is a number we would have to defend.
  it("permits [4] when one tutor finds both halves", () => {
    const v = verdict({
      cards: [card("p1"), card("p2"), card("demonic")],
      tutorIds: new Set(["demonic"]),
      twoCardCombos: [combo("v1", ["Infinite mana"])],
    });
    expect(v.permits).toEqual([4]);
  });

  it("permits [4] when two tutors each find a different half", () => {
    const v = verdict({
      cards: [card("p1"), card("p2"), card("t1"), card("t2")],
      tutorIds: new Set(["t1", "t2"]),
      twoCardCombos: [combo("v1", ["Infinite mana"])],
      tutorReaches: (tutorId, piece) =>
        (tutorId === "t1" && piece.oracleId === "p1") ||
        (tutorId === "t2" && piece.oracleId === "p2"),
    });
    expect(v.permits).toEqual([4]);
  });

  it("stays at [3] when every tutor reaches the same single half", () => {
    // One half searchable and the other left to chance is the deck this boundary calls a 3.
    // Two tutors here, and it is still a 3 — which is what makes this a coverage rule rather
    // than a count.
    const v = verdict({
      cards: [card("p1"), card("p2"), card("t1"), card("t2")],
      tutorIds: new Set(["t1", "t2"]),
      twoCardCombos: [combo("v1", ["Infinite mana"])],
      tutorReaches: (_tutorId, piece) => piece.oracleId === "p1",
    });
    expect(v.permits).toEqual([3]);
    expect(v.lean).toMatchObject({ likely: 3, reason: "drawOnly" });
  });

  it("permits [4] when the combo IS the two commanders", () => {
    // A partner deck whose combo is both commanders assembles it in the command zone every
    // game, and no tutor can ever reach either piece — the builder skips a reach for EVERY
    // commander. Deducting a flat one for `usesCommander` left this needing a tutor for a
    // combo that is always available, which is the case that proves coverage is counted per
    // piece rather than subtracted once.
    const v = verdict({
      cards: [card("cmd1"), card("cmd2")],
      commanderOracleIds: ["cmd1", "cmd2"],
      twoCardCombos: [
        { ...combo("v1", ["Infinite mana"], ["cmd1", "cmd2"]), usesCommander: true },
      ],
    });
    expect(v.permits).toEqual([4]);
  });

  it("permits [4] on a commander combo whose one library piece is reachable", () => {
    // A commander is not in the library, so no tutor can ever "reach" it — the builder
    // skips it by design. Requiring every piece to be tutored would make a commander combo
    // the one case that could never resolve to 4, which is backwards.
    const v = verdict({
      // The commander is a CARD on the profile — the loader unions both commander rows into
      // `cards` before any classifier runs — and `commanderOracleIds` is what marks it.
      cards: [card("cmd"), card("p2"), card("demonic")],
      commanderOracleIds: ["cmd"],
      tutorIds: new Set(["demonic"]),
      twoCardCombos: [{ ...combo("v1", ["Infinite mana"], ["cmd", "p2"]), usesCommander: true }],
    });
    expect(v.permits).toEqual([4]);
  });

  it("mass land denial drops a deck to [4,5] on its own", () => {
    const v = verdict({
      cards: [card("armageddon")],
      mldFlags: new Map([["armageddon", ["spellbook_sweep", "oracle_rule"] as FlagSource[]]]),
    });
    expect(v.permits).toEqual([4, 5]);
    expect(v.limits.bracket3.massLandDenial.cards[0].sources).toEqual([
      "spellbook_sweep",
      "oracle_rule",
    ]);
  });

  // The commanders-are-cards rule, at the verdict. A Kinnan-led deck with a clean 99 is
  // not a bracket 1 deck, and the profile is what folds the commander in.
  it("a Game Changer COMMANDER counts against every limit", () => {
    const v = verdict({ cards: [card("cmd")], gameChangerIds: new Set(["cmd"]) });
    expect(v.permits).toEqual([3]);
  });
});

describe("the lean", () => {
  it("is null where no combo decided the bracket", () => {
    expect(verdict().lean).toBeNull();
    expect(
      verdict({
        cards: [card("gc1")],
        gameChangerIds: new Set(["gc1"]),
      }).lean,
    ).toBeNull();
  });

  it("leans 4 when the tutors cover EVERY piece, with the tutor named", () => {
    // `tutorReaches` is stated rather than defaulted: the builder's default is "reaches
    // everything", under which this case passes on the overturned single-reach rule too —
    // and a case that holds under both rules is not testing the one that shipped.
    const v = verdict({
      cards: [card("p1"), card("p2"), card("demonic")],
      tutorIds: new Set(["demonic"]),
      twoCardCombos: [combo("v1", ["Infinite mana"])],
      tutorReaches: (tutorId, piece) =>
        tutorId === "demonic" && (piece.oracleId === "p1" || piece.oracleId === "p2"),
    });
    expect(v.lean).toMatchObject({ likely: 4, reason: "reachable" });
    expect(v.lean!.receipts[0].tutors.map((t) => t.oracleId)).toEqual(["demonic"]);
  });

  it("leans 3 when the combo is assembled by drawing alone", () => {
    const v = verdict({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite mana"])],
    });
    expect(v.lean).toMatchObject({ likely: 3, reason: "drawOnly" });
    expect(v.lean!.receipts[0].tutors).toEqual([]);
  });
});

describe("the declaration", () => {
  // Never corrected, never inferred, never defaulted. Drift is its own finding.
  it("reports drift without changing the permitted range", () => {
    const v = verdict({
      cards: [card("p1"), card("p2")],
      declared: 2,
      twoCardCombos: [combo("v1", ["Infinite turns"])],
    });
    expect(v.declared).toBe(2);
    expect(v.permits).toEqual([4, 5]);
    expect(v.declaredOutsidePermits).toBe(true);
  });

  it("is not drift when the declaration is inside the range", () => {
    expect(verdict({ declared: 2 }).declaredOutsidePermits).toBe(false);
  });

  it("no declaration is never drift", () => {
    expect(verdict({ declared: null }).declaredOutsidePermits).toBe(false);
  });
});

describe("what is reported and not scored", () => {
  // Above bracket 1 the text is about CHAINING extra turns, which a decklist cannot answer.
  // The count is carried so a reader sees it, with no verdict attached.
  it("carries extra turns as unquantified once bracket 1 has fallen", () => {
    const v = verdict({
      cards: [card("t1"), card("gc1")],
      extraTurnFlags: new Map([["t1", ["oracle_rule"] as FlagSource[]]]),
      gameChangerIds: new Set(["gc1"]),
    });
    expect(v.unquantified.extraTurns.map((c) => c.oracleId)).toEqual(["t1"]);
  });

  it("carries the detection coverage through unchanged — every detection is partial", () => {
    expect(verdict().detection).toEqual(DETECTION);
  });
});
