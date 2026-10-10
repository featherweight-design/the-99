import { describe, expect, it } from "vitest";

import type { Bracket, ComboRef, FlagSource } from "../profile/types";
import { cutFacts } from "./cuts";
import { deck, profile, row, support } from "./cuts-fixture";

const facts = (over: Parameters<typeof cutFacts>[0] extends infer I ? Partial<I> : never = {}) =>
  cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: null, ...over });
const combo = (variantId: string, ids: string[], produces: string[]): ComboRef => ({
  variantId, cards: ids.map((oracleId) => ({ oracleId, name: oracleId })), produces, bracketTag: "R", usesCommander: false,
  manaValueNeeded: null, manaNeeded: null, steps: null, notablePrerequisites: null,
});
const card = (f: ReturnType<typeof cutFacts>, id: string) => f.cards.find((c) => c.oracleId === id);

describe("cutFacts", () => {
  it("offers nothing at exactly 100, commanders included, but still states the deck's figures", () => {
    const f = facts({ profile: profile({}, deck(48)) });
    expect(f).toMatchObject({ total: 100, over: 0, cards: [], brackets: [] });
    expect(f.roles.length).toBe(5);
  });

  it("counts the commander toward the total (ruling 4)", () => {
    expect(facts()).toMatchObject({ total: 102, over: 2 });
  });

  it("never lists the commander or a locked card", () => {
    const f = facts({ locked: new Set(["ramp0", "bear0"]) });
    const ids = f.cards.map((c) => c.oracleId);
    expect(ids).not.toContain("cmd");
    expect(ids).not.toContain("ramp0");
    expect(ids).not.toContain("bear0");
    expect(ids).toContain("bear1");
  });

  it("lists cards in the deck's own order, never ranked", () => {
    const ids = facts({ support: support([]) }).cards.map((c) => c.oracleId);
    expect(ids.slice(0, 3)).toEqual(["forest", "ramp0", "ramp1"]);
  });

  it("states every role against its target, on the population the target was derived for", () => {
    const roles = Object.fromEntries(facts().roles.map((r) => [r.role, r]));
    expect(roles.ramp).toEqual({ role: "ramp", have: 12, target: 10 });
    expect(roles.draw).toEqual({ role: "draw", have: 2, target: 10 });
  });

  it("gives inclusion as a figure, or as off the list, or none for a basic land", () => {
    const f = facts({ support: support([["bear7", 4]]) });
    expect(card(f, "bear7")!.inclusion).toEqual({ kind: "pct", pct: 4 });
    expect(card(f, "bear3")!.inclusion).toEqual({ kind: "offList" });
    expect(card(f, "forest")!.inclusion).toBeNull();
    expect(f.support).toEqual({ deckCount: 21375, listed: 246 });
  });

  it("marks a role surplus only when every role the card fills is over, and a gap when one is not", () => {
    const f = facts();
    expect(card(f, "ramp0")!.roleSurplus).toEqual({ role: "ramp", have: 12, target: 10 });
    expect(card(f, "draw0")!.roleSurplus).toBeNull();
    expect(card(f, "draw0")!.opensGap).toBe("draw");
  });

  it("names curve crowding against the commander's average curve, and not for a land", () => {
    const f = facts();
    expect(card(f, "bear0")!.curve).toEqual({ cmc: 3, have: 50, average: 30 });
    expect(card(f, "forest")!.curve).toBeNull();
  });

  it("runs with no EDHREC list and says the inclusion fact is missing (ruling 6)", () => {
    const f = facts();
    expect(f.missing).toEqual(["inclusion"]);
    expect(f.cards.length).toBeGreaterThan(0);
  });

  it("names asserted role targets and an absent curve as missing", () => {
    const f = facts({
      profile: profile({
        composition: { pair: null, commander: null, identity: null, count: null },
        roles: { pair: null, commander: null, identity: null, count: null },
      }),
      support: support([]),
    });
    expect(f.missing).toEqual(["roleTargets", "curve"]);
    expect(f.curve).toBeNull();
  });

  describe("bracket flags against the declared bracket", () => {
    const four = { gameChangerIds: new Set(["bear1", "bear2", "bear3", "bear4"]) };
    const everything = {
      ...four,
      mldFlags: new Map<string, FlagSource[]>([["bear5", ["oracle_rule"]]]),
      extraTurnFlags: new Map<string, FlagSource[]>([["bear6", ["oracle_rule"]]]),
      twoCardCombos: [
        combo("c-plain", ["bear7", "bear8"], ["Infinite mana"]),
        combo("c-loop", ["bear9", "bear10"], ["Infinite turns"]),
      ],
    };
    const flags = (declaredBracket: Bracket | null, over: Partial<Parameters<typeof profile>[0]> = everything) =>
      cutFacts({ profile: profile(over), locked: new Set(), support: null, declaredBracket })
        .brackets.map((b) => b.flag);
    const cards = (declaredBracket: Bracket | null, flag: string) =>
      cutFacts({ profile: profile(everything), locked: new Set(), support: null, declaredBracket })
        .brackets.find((b) => b.flag === flag)?.cards.map((c) => c.oracleId).sort();

    it("names every flag when no bracket is declared", () => {
      expect(flags(null)).toEqual(["gameChanger", "massLandDenial", "extraTurn", "combo"]);
    });

    it("names all four for a declared 1", () => {
      expect(flags(1)).toEqual(["gameChanger", "massLandDenial", "extraTurn", "combo"]);
    });

    it("drops extra turns at a declared 2, and keeps Game Changers, mass land denial and combos", () => {
      expect(flags(2)).toEqual(["gameChanger", "massLandDenial", "combo"]);
      expect(cards(2, "combo")).toEqual(["bear10", "bear7", "bear8", "bear9"]);
    });

    it("at a declared 3 names a combo only when it is a loop, and a Game Changer only past three", () => {
      expect(flags(3)).toEqual(["gameChanger", "massLandDenial", "combo"]);
      expect(cards(3, "combo")).toEqual(["bear10", "bear9"]);
      expect(flags(3, { gameChangerIds: new Set(["bear1", "bear2"]) })).toEqual([]);
    });

    it("names no flag for a declared 4 or 5, however many the deck holds", () => {
      expect(flags(4)).toEqual([]);
      expect(flags(5)).toEqual([]);
    });

    it("keeps a commander piece in the deck-level combo, though no card list carries the commander", () => {
      const f = cutFacts({
        profile: profile({ twoCardCombos: [combo("c-cmd", ["cmd", "bear1"], ["Infinite mana"])] }),
        locked: new Set(), support: null, declaredBracket: 2,
      });
      expect(f.brackets.find((b) => b.flag === "combo")!.cards.map((c) => c.oracleId).sort()).toEqual(["bear1", "cmd"]);
      expect(card(f, "cmd")).toBeUndefined();
      expect(card(f, "bear1")!.flags).toEqual(["combo"]);
    });

    it("carries the flags a card bears on the card itself", () => {
      const f = cutFacts({ profile: profile(everything), locked: new Set(), support: null, declaredBracket: 3 });
      expect(card(f, "bear1")!.flags).toEqual(["gameChanger"]);
      expect(card(f, "bear9")!.flags).toEqual(["combo"]);
      expect(card(f, "bear7")!.flags).toEqual([]);
    });
  });

  it("keeps a vanilla card unflagged", () => {
    const f = facts({ profile: profile({}, deck(49, [row({ oracleId: "vanilla", cmc: 2 })])), support: support([]) });
    expect(card(f, "vanilla")).toMatchObject({ flags: [], roleSurplus: null, opensGap: null });
  });
});
