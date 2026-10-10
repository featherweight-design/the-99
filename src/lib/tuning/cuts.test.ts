import { describe, expect, it } from "vitest";

import { cutFacts } from "./cuts";
import { deck, profile, row, support } from "./cuts-fixture";

const facts = (over: Parameters<typeof cutFacts>[0] extends infer I ? Partial<I> : never = {}) =>
  cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: null, ...over });
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
    const gc = { gameChangerIds: new Set(["bear1", "bear2"]) };
    const flags = (declaredBracket: number | null, over = gc) =>
      facts({ profile: profile(over), declaredBracket }).brackets.map((b) => b.flag);

    it("names every flag when no bracket is declared", () => {
      expect(flags(null)).toEqual(["gameChanger"]);
    });

    it("names Game Changers for a declared 2, which allows none", () => {
      expect(flags(2)).toEqual(["gameChanger"]);
      expect(card(facts({ profile: profile(gc), declaredBracket: 2 }), "bear1")!.flags).toEqual(["gameChanger"]);
    });

    it("names Game Changers for a declared 3 only past its allowance of three", () => {
      expect(flags(3)).toEqual([]);
      expect(flags(3, { gameChangerIds: new Set(["bear1", "bear2", "bear3", "bear4"]) })).toEqual(["gameChanger"]);
    });

    it("names no flag for a declared 4 or 5, however many the deck holds", () => {
      const four = { gameChangerIds: new Set(["bear1", "bear2", "bear3", "bear4"]) };
      expect(flags(3, four)).toEqual(["gameChanger"]);
      expect(flags(4, four)).toEqual([]);
      expect(flags(5, four)).toEqual([]);
    });
  });

  it("keeps a card a vanilla and unflagged", () => {
    const f = facts({ profile: profile({}, deck(49, [row({ oracleId: "vanilla", cmc: 2 })])), support: support([]) });
    expect(card(f, "vanilla")).toMatchObject({ flags: [], roleSurplus: null, opensGap: null });
  });
});
