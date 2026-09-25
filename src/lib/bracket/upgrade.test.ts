import { describe, expect, it } from "vitest";

import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../profile/build";
import type { ComboRef, DetectionCoverage, FlagSource } from "../profile/types";
import { lockedLast, unreachable, upgradePath, type UpgradeItem } from "./upgrade";

const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "t" },
  extraTurn: { methods: ["m"], basis: "t" },
  twoCardCombos: { methods: ["m"], basis: "t" },
};

const card = (oracleId: string): ProfileCardRow => ({
  oracleId, name: oracleId, typeLine: "Creature — Human", oracleText: null, keywords: [],
  cmc: 2, colorIdentity: [], manaCost: "{1}{G}", quantity: 1, commanderLegal: true, layout: "normal",
});

const combo = (variantId: string, produces: string[], pieces: string[]): ComboRef => ({
  variantId,
  cards: pieces.map((p) => ({ oracleId: p, name: p })),
  produces,
  bracketTag: "casual",
  usesCommander: pieces.includes("cmd"),
  // Null on every fixture here: these suites assert bracket RULES, and no rule reads
  // the modal's payload. `probe:bracket` covers the loader that populates them.
  manaValueNeeded: null,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
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

const find = (items: UpgradeItem[], rule: string) => items.find((i) => i.rule === rule);

describe("a count rule", () => {
  // Determined in CARDINALITY, undetermined in IDENTITY — and it stays that way. Naming
  // one of four equally valid cuts would dress a coin toss as a recommendation.
  it("lists every candidate beside the count that must come out of them", () => {
    const ids = ["gc1", "gc2", "gc3", "gc4"];
    const path = upgradePath(profile({ cards: ids.map(card), gameChangerIds: new Set(ids) }), 3);
    expect(find(path.items, "gameChangers")).toMatchObject({ removeCount: 1 });
    expect(
      (find(path.items, "gameChangers") as { candidates: { oracleId: string }[] }).candidates.map(
        (c) => c.oracleId,
      ),
    ).toEqual(ids);
    expect(path.blocked).toBe(false);
  });

  it("drops to zero at target 2, where no Game Changer is allowed", () => {
    const ids = ["gc1", "gc2"];
    const path = upgradePath(profile({ cards: ids.map(card), gameChangerIds: new Set(ids) }), 2);
    expect(find(path.items, "gameChangers")).toMatchObject({ removeCount: 2 });
  });

  it("is absent when the deck already satisfies the limit", () => {
    const ids = ["gc1", "gc2", "gc3"];
    const path = upgradePath(profile({ cards: ids.map(card), gameChangerIds: new Set(ids) }), 3);
    expect(path.items).toEqual([]);
    expect(path.blocked).toBe(false);
  });

  // Bracket 1 is the only bracket where the COUNT of extra turns is an item. Above it the
  // rule is about chaining them, which no removal list can answer.
  it("counts extra turns at target 1 and not above it", () => {
    const p = profile({
      cards: [card("t1")],
      extraTurnFlags: new Map([["t1", ["oracle_rule"] as FlagSource[]]]),
    });
    expect(find(upgradePath(p, 1).items, "extraTurns")).toMatchObject({ removeCount: 1 });
    expect(find(upgradePath(p, 2).items, "extraTurns")).toBeUndefined();
    expect(find(upgradePath(p, 3).items, "extraTurns")).toBeUndefined();
  });

  it("lists mass land denial at every target", () => {
    const p = profile({
      cards: [card("armageddon")],
      mldFlags: new Map([["armageddon", ["oracle_rule"] as FlagSource[]]]),
    });
    for (const target of [1, 2, 3] as const) {
      expect(find(upgradePath(p, target).items, "massLandDenial")).toMatchObject({
        removeCount: 1,
      });
    }
  });
});

describe("combos", () => {
  it("breaks every combo at targets 1 and 2, one piece set per combo", () => {
    const p = profile({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite mana"], ["p1", "p2"])],
    });
    const item = find(upgradePath(p, 2).items, "twoCardCombos") as {
      combos: { combo: ComboRef; candidates: { oracleId: string }[] }[];
    };
    expect(item.combos).toHaveLength(1);
    expect(item.combos[0].candidates.map((c) => c.oracleId)).toEqual(["p1", "p2"]);
  });

  // At bracket 3 a generic infinite WIDENS the range rather than violating it, so listing
  // it would tell a player to cut a card for a rule the target does not state. A LOOP does
  // violate, and is listed.
  it("at target 3 lists a loop and not a generic infinite", () => {
    const generic = profile({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite mana"], ["p1", "p2"])],
    });
    expect(find(upgradePath(generic, 3).items, "twoCardCombos")).toBeUndefined();

    const loop = profile({
      cards: [card("p1"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite turns"], ["p1", "p2"])],
    });
    expect(find(upgradePath(loop, 3).items, "twoCardCombos")).toBeDefined();
  });
});

describe("what a removal cannot reach", () => {
  // The converse of the commanders-are-cards rule. A commander is a card you cannot cut.
  it("never offers a commander as a candidate", () => {
    const p = profile({
      cards: [card("cmd"), card("gc1"), card("gc2"), card("gc3")],
      gameChangerIds: new Set(["cmd", "gc1", "gc2", "gc3"]),
    });
    const item = find(upgradePath(p, 3).items, "gameChangers") as {
      removeCount: number;
      candidates: { oracleId: string }[];
    };
    expect(item.candidates.map((c) => c.oracleId)).not.toContain("cmd");
    expect(item.candidates).toHaveLength(3);
  });

  // The shortfall is left VISIBLE in the item rather than replaced by a message: a reader
  // comparing candidates.length to removeCount can see exactly how short it is.
  it("is blocked when the excess sits on the commander alone", () => {
    const p = profile({ cards: [card("cmd")], gameChangerIds: new Set(["cmd"]) });
    const path = upgradePath(p, 2);
    const item = find(path.items, "gameChangers") as {
      removeCount: number;
      candidates: unknown[];
    };
    expect(item).toMatchObject({ removeCount: 1 });
    expect(item.candidates).toEqual([]);
    expect(path.blocked).toBe(true);
  });

  it("is blocked when every piece of a combo is in the command zone", () => {
    const p = profile({
      cards: [card("cmd"), card("partner")],
      commanderOracleIds: ["cmd", "partner"],
      twoCardCombos: [combo("v1", ["Infinite mana"], ["cmd", "partner"])],
    });
    const path = upgradePath(p, 2);
    const item = find(path.items, "twoCardCombos") as {
      combos: { candidates: unknown[] }[];
    };
    expect(item.combos[0].candidates).toEqual([]);
    expect(path.blocked).toBe(true);
  });

  it("is not blocked when one piece is in the 99", () => {
    const p = profile({
      cards: [card("cmd"), card("p2")],
      twoCardCombos: [combo("v1", ["Infinite mana"], ["cmd", "p2"])],
    });
    const path = upgradePath(p, 2);
    expect(path.blocked).toBe(false);
  });
});

describe("unreachable (Locked, F6)", () => {
  const refs = (...ids: string[]) => ids.map((oracleId) => ({ oracleId, name: oracleId }));
  const four = refs("a", "b", "c", "d");

  it("holds the boundary: exactly removeCount unlocked is reachable, one fewer is not", () => {
    expect(unreachable(four, 2, new Set(["a", "b"]))).toBeNull();
    expect(unreachable(four, 2, new Set(["a", "b", "c"]))).toEqual({ locked: 3, total: 4 });
  });

  it("takes the Forced state out with a single lock", () => {
    expect(unreachable(refs("a", "b"), 2, new Set())).toBeNull();
    expect(unreachable(refs("a", "b"), 2, new Set(["b"]))).toEqual({ locked: 1, total: 2 });
  });

  it("reads a combo at a count of one: unreachable only when every cuttable piece is locked", () => {
    expect(unreachable(refs("a", "b"), 1, new Set(["a"]))).toBeNull();
    expect(unreachable(refs("a", "b"), 1, new Set(["a", "b"]))).toEqual({ locked: 2, total: 2 });
  });

  it("leaves a commander shortfall to `blocked`, which no unlock can fix", () => {
    expect(unreachable(refs("a"), 2, new Set(["a"]))).toBeNull();
    expect(unreachable([], 1, new Set())).toBeNull();
  });

  it("counts only locks among the candidates", () => {
    expect(unreachable(four, 2, new Set(["x", "y", "z"]))).toBeNull();
  });

  it("lists locked candidates last and keeps every other order", () => {
    expect(lockedLast(four, new Set(["b", "a"])).map((c) => c.oracleId)).toEqual(["c", "d", "a", "b"]);
    expect(lockedLast(four, new Set()).map((c) => c.oracleId)).toEqual(["a", "b", "c", "d"]);
  });
});
