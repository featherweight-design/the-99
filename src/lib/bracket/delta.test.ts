import { describe, expect, it } from "vitest";

import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../profile/build";
import type { ComboRef, DetectionCoverage, FlagSource } from "../profile/types";
import { bracketDelta, type CandidateFacts } from "./delta";

const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "t" },
  extraTurn: { methods: ["m"], basis: "t" },
  twoCardCombos: { methods: ["m"], basis: "t" },
};

const card = (oracleId: string): ProfileCardRow => ({
  oracleId, name: oracleId, typeLine: "Creature — Human", oracleText: null, keywords: [],
  cmc: 2, colorIdentity: [], manaCost: "{1}{G}", quantity: 1, commanderLegal: true, layout: "normal",
});

const combo = (variantId: string, produces: string[]): ComboRef => ({
  variantId,
  cards: [{ oracleId: "p1", name: "p1" }, { oracleId: "p2", name: "p2" }],
  produces,
  bracketTag: "casual",
  usesCommander: false,
});

function profile(over: Partial<ProfileInput> = {}) {
  return buildDeckProfile({
    deckId: "d", fingerprint: "f", cards: [], commanderOracleIds: ["cmd"], identity: ["G"],
    condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: null, identity: null, count: null },
    thinCondition: false,
    staples: [], commanderDeckCount: null, population: null,
    mldFlags: new Map<string, FlagSource[]>(), extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  });
}

const candidate = (over: Partial<CandidateFacts> = {}): CandidateFacts => ({
  card: { oracleId: "cand", name: "Candidate" },
  gameChanger: false, massLandDenial: false, extraTurn: false, tutor: false,
  completesCombos: [],
  ...over,
});

/** A deck sitting at exactly [3]: three Game Changers, nothing else. */
const atThree = () => {
  const ids = ["gc1", "gc2", "gc3"];
  return profile({ cards: ids.map(card), gameChangerIds: new Set(ids) });
};

describe("moves", () => {
  it("Armageddon on a [3] deck moves it to [4,5], named as massLandDenial", () => {
    const d = bracketDelta(atThree(), candidate({ massLandDenial: true }));
    expect(d).toMatchObject({ kind: "moves", from: [3], to: [4, 5] });
    expect(d.kind === "moves" && d.rule.rule).toBe("massLandDenial");
    expect(d.kind === "moves" && d.rule.cards[0].oracleId).toBe("cand");
  });

  // Ruled 2026-09-20: the combo boundary RESOLVES on whether the deck's tutors can assemble
  // the combo, so completing one in a deck that cannot search for it moves nothing — the deck
  // was a 3 and stays a 3.
  //
  // KNOWN HOLE, and Round 4's to design rather than this function's to invent: the push check
  // is then SILENT about an add that gives the reader a two-card infinite they did not have.
  // The bracket is honestly unchanged, but "nothing happens" is not the whole truth, and the
  // `ruleless` shape beside this one exists for exactly this class of fact. Recorded in the
  // spec amendment rather than patched here, because the push line is a designed surface.
  it("a card completing a combo the deck cannot tutor for is INERT, not silent", () => {
    // The hole this shape exists to close. The range does not move, so this used to return
    // `none` — and the reader was told nothing at the moment they put a two-card combo in
    // their deck. A silence that follows a real event is the worst reading available.
    const c = combo("v1", ["Infinite mana"]);
    const d = bracketDelta(atThree(), candidate({ completesCombos: [c] }));
    expect(d).toEqual({ kind: "inert", fact: "combo", combos: [c], to: [3] });
  });

  // DELIBERATELY NOT TESTED HERE: "the add makes the combo assemblable, so the push check
  // reports [3] → [4]". That state cannot exist. `buildDeckProfile` computes reaches over the
  // combos the deck ALREADY holds, so no reach can name a variant the deck is still one card
  // away from — a fixture that hand-writes one asserts a transition the push check can never
  // reach in production, which is a test measuring nothing.
  //
  // It is the same hole the case above names, seen from the other side, and it is Round 4's:
  // the push check cannot currently say "this add hands you a combo your tutors can already
  // find", because nothing has computed that reach yet.

  // The loop clause, not the widening. A completed infinite-TURNS combo violates B3 outright.
  it("a card completing an infinite-turns combo moves a [3] deck to [4,5]", () => {
    const d = bracketDelta(
      atThree(),
      candidate({ completesCombos: [combo("v1", ["Infinite turns"])] }),
    );
    expect(d).toMatchObject({ kind: "moves", to: [4, 5] });
    expect(d.kind === "moves" && d.rule.rule).toBe("extraTurns");
    expect(d.kind === "moves" && d.rule.combos?.[0].variantId).toBe("v1");
  });

  // Bracket 1 is the only bracket that COUNTS extra turns, so the same card that is
  // `unquantified` above moves the range here.
  it("an extra-turn card on a clean deck moves [1,2] to [2]", () => {
    const d = bracketDelta(profile(), candidate({ extraTurn: true }));
    expect(d).toMatchObject({ kind: "moves", from: [1, 2], to: [2] });
    expect(d.kind === "moves" && d.rule.bracket).toBe(1);
  });
});

describe("counts", () => {
  // §7.2's own second example. It MOVES as well, and the count is still the sentence a
  // reader needs — "4 of 3", not "the range widened".
  it("a fourth Game Changer counts, even though it also moves", () => {
    // It CROSSED bracket 3, so that is the allowance the count is measured against —
    // "your 4th game changer, and Upgraded allows 3", which is §7.2's own example.
    expect(bracketDelta(atThree(), candidate({ gameChanger: true }))).toEqual({
      kind: "counts", rule: "gameChangers", now: 4,
      bindingBracket: 3, limit: 3,
      from: [3], to: [4, 5], combos: [],
    });
  });

  it("a second Game Changer counts and does not move", () => {
    const p = profile({ cards: [card("gc1")], gameChangerIds: new Set(["gc1"]) });
    expect(bracketDelta(p, candidate({ gameChanger: true }))).toEqual({
      kind: "counts", rule: "gameChangers", now: 2,
      bindingBracket: 3, limit: 3,
      from: [3], to: [3], combos: [],
    });
  });

  it("names the limit that BIT, not bracket 3's, when the first one costs Exhibition", () => {
    // The defect the field replaces: `limit` was bracket 3's always, so a deck losing
    // Exhibition on its FIRST Game Changer read "your 1st, and Upgraded allows 3" — naming
    // an allowance it was nowhere near and staying silent about the one it crossed.
    const d = bracketDelta(profile({ cards: [card("x")] }), candidate({ gameChanger: true }));
    expect(d).toMatchObject({ kind: "counts", now: 1, bindingBracket: 2, limit: 0, from: [1, 2] });
  });

  it("names NO limit on a deck already past every bracket that states one", () => {
    // The state the binding bracket can be null in, and the one with no sentence before it:
    // a [4,5] deck adding a Game Changer crosses nothing, and nothing up there states an
    // allowance. The count is still true; there is simply no figure to measure it against.
    const p = profile({
      cards: Array.from({ length: 4 }, (_, i) => card(`gc${i}`)),
      gameChangerIds: new Set(["gc0", "gc1", "gc2", "gc3"]),
    });
    expect(bracketDelta(p, candidate({ gameChanger: true }))).toMatchObject({
      kind: "counts", now: 5, bindingBracket: null, limit: null, from: [4, 5], to: [4, 5],
    });
  });

  it("a tutor on a deck whose tutors already assemble a combo says so", () => {
    // `ruleless` is returned either way; the FLAG is what lets the sentence stop asserting an
    // absence that is not there.
    const ids = ["demonic"];
    const p = profile({
      cards: [card("p1"), card("p2"), card("demonic")],
      tutorIds: new Set(ids),
      twoCardCombos: [combo("v1", ["Infinite mana"])],
      tutorReaches: () => true,
    });
    expect(bracketDelta(p, candidate({ tutor: true }))).toMatchObject({
      kind: "ruleless", coversACombo: true,
    });
  });

  // Underworld Breach: a Game Changer that also completes a combo. The precedence is
  // explicit so the shape does not depend on which branch was written first.
  it("a Game Changer that also completes a combo still counts", () => {
    const d = bracketDelta(
      atThree(),
      candidate({ gameChanger: true, completesCombos: [combo("v1", ["Infinite mana"])] }),
    );
    expect(d.kind).toBe("counts");
  });
});

describe("unquantified", () => {
  // Above bracket 1 the rule is about CHAINING extra turns, which a decklist cannot answer.
  // The card is reported and refused a verdict — and it never moves the range.
  it("a third extra-turn card on a [3] deck is unquantified, not a move", () => {
    const p = profile({
      cards: [card("gc1"), card("gc2"), card("gc3"), card("t1"), card("t2")],
      gameChangerIds: new Set(["gc1", "gc2", "gc3"]),
      extraTurnFlags: new Map([
        ["t1", ["oracle_rule"] as FlagSource[]],
        ["t2", ["oracle_rule"] as FlagSource[]],
      ]),
    });
    expect(bracketDelta(p, candidate({ extraTurn: true }))).toEqual({
      kind: "unquantified", rule: "extraTurns", now: 3, bracket: 3,
    });
  });
});

describe("ruleless", () => {
  // The three variants read alike in prose and mean different things. A tutor is not
  // unquantified — that would imply a rule we cannot measure — and not `none`, which would
  // hide the fact entirely.
  it("an eighth tutor is ruleless: never unquantified, never a move", () => {
    const ids = Array.from({ length: 7 }, (_, i) => `t${i}`);
    const p = profile({ cards: ids.map(card), tutorIds: new Set(ids) });
    expect(bracketDelta(p, candidate({ tutor: true }))).toEqual({
      kind: "ruleless", fact: "tutors", now: 8, coversACombo: false,
    });
  });
});

describe("none", () => {
  it("an ordinary card on a [3] deck changes nothing", () => {
    expect(bracketDelta(atThree(), candidate())).toEqual({ kind: "none" });
  });

  it("a second combo on a deck that already holds one is inert, and says which", () => {
    const p = profile({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite mana"])],
    });
    const added = combo("v2", ["Infinite mana"]);
    const d = bracketDelta(p, candidate({ completesCombos: [added] }));
    // The COMPLETED combo, not the one the deck already had — the sentence names what the
    // card just did, and naming the standing one would describe a different event.
    expect(d).toMatchObject({ kind: "inert", fact: "combo", combos: [added] });
  });

  it("an ordinary card is still silent — `none` survives as a drawn absence", () => {
    // `inert` widens what speaks; it must not swallow the case that should say nothing.
    expect(bracketDelta(atThree(), candidate())).toEqual({ kind: "none" });
  });
});

// Underworld Breach: a Game Changer that also completes a combo. The precedence sends it to
// `counts` — the count is the sentence a reader needs — but the combo receipts have to come
// with it, or the consumer is told "4 of 3" and cannot explain the rest of what the card did.
describe("a counts result carries its co-fired combo receipts", () => {
  it("names the combos a Game Changer also completes", () => {
    const completed = combo("v1", ["Infinite mana"]);
    const d = bracketDelta(
      atThree(),
      candidate({ gameChanger: true, completesCombos: [completed] }),
    );
    expect(d.kind).toBe("counts");
    expect(d.kind === "counts" && d.combos.map((c) => c.variantId)).toEqual(["v1"]);
  });

  it("is an empty list when the Game Changer completes nothing", () => {
    const d = bracketDelta(atThree(), candidate({ gameChanger: true }));
    expect(d.kind === "counts" && d.combos).toEqual([]);
  });
});
