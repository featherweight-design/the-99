import { describe, expect, it } from "vitest";

import { rankCandidates, withinBracket, withinBudget, type Answers, type Candidate, type CardFacts } from "./rank";

const none: Answers = { colors: [], match: "contains", themes: [], card: null, budgetDollars: null, bracket: null };
const cmd = (over: Partial<Candidate> & { name: string }): Candidate => ({
  oracleId: over.name, colorIdentity: ["G"], deckCount: 1000, tags: [],
  owned: false, priceCents: 100, cardInclusion: null, combosWithCard: { combos: 0, loops: 0 }, ownedSupport: 0,
  gameChanger: false, massLandDenial: false, extraTurn: false,
  ...over,
});
const tag = (slug: string, count: number) => ({ slug, label: slug, count });
const card = (over: Partial<CardFacts> = {}): CardFacts => ({
  oracleId: "ds", owned: false, priceCents: 5000, gameChanger: false, massLandDenial: false, extraTurn: false, ...over,
});
const names = (r: ReturnType<typeof rankCandidates>) => r.rows.map((x) => x.candidate.name);

describe("the order", () => {
  it("orders by theme fit, with the collection deciding nothing (ruling 5)", () => {
    const r = rankCandidates([
      cmd({ name: "Owned lots", ownedSupport: 80, tags: [tag("dinos", 200)] }),
      cmd({ name: "Best fit", ownedSupport: 0, tags: [tag("dinos", 620)] }),
    ], { ...none, themes: ["dinos"] }, null);
    expect(r.order).toBe("fit");
    expect(names(r)).toEqual(["Best fit", "Owned lots"]);
    expect(r.rows[0].themeFits).toEqual([{ slug: "dinos", share: 0.62 }]);
  });

  it("orders several answers by the weakest figure, and returns every figure", () => {
    const r = rankCandidates([
      cmd({ name: "Strong theme, weak card", tags: [tag("dinos", 900)], cardInclusion: 0.1 }),
      cmd({ name: "Even", tags: [tag("dinos", 400)], cardInclusion: 0.4 }),
    ], { ...none, themes: ["dinos"], card: "ds" }, card());
    expect(names(r)).toEqual(["Even", "Strong theme, weak card"]);
    expect(r.rows[1]).toMatchObject({ themeFits: [{ slug: "dinos", share: 0.9 }], cardFit: 0.1 });
  });

  it("with no theme and no card, orders by owned support and says so", () => {
    const r = rankCandidates([cmd({ name: "Few", ownedSupport: 3 }), cmd({ name: "Many", ownedSupport: 41 })], none, null);
    expect(r.order).toBe("owned");
    expect(names(r)).toEqual(["Many", "Few"]);
  });

  it("breaks a tie on more decks, then on name", () => {
    const r = rankCandidates([
      cmd({ name: "B", deckCount: 500 }), cmd({ name: "A", deckCount: 500 }), cmd({ name: "C", deckCount: 900 }),
    ], none, null);
    expect(names(r)).toEqual(["C", "A", "B"]);
  });
});

describe("the filters", () => {
  it("applies the colour control's own rule, Any and Exactly", () => {
    const pool = [cmd({ name: "G", colorIdentity: ["G"] }), cmd({ name: "GW", colorIdentity: ["G", "W"] })];
    expect(names(rankCandidates(pool, { ...none, colors: ["G"] }, null))).toEqual(["G", "GW"]);
    expect(names(rankCandidates(pool, { ...none, colors: ["G"], match: "exactly" }, null))).toEqual(["G"]);
  });

  it("drops a commander that cannot back every theme asked", () => {
    const pool = [cmd({ name: "Both", tags: [tag("dinos", 300), tag("ramp", 300)] }), cmd({ name: "One", tags: [tag("dinos", 300)] })];
    expect(names(rankCandidates(pool, { ...none, themes: ["dinos", "ramp"] }, null))).toEqual(["Both"]);
  });

  it("drops a commander whose decks never run the card", () => {
    const pool = [cmd({ name: "Runs it", cardInclusion: 0.2 }), cmd({ name: "Never", cardInclusion: null })];
    expect(names(rankCandidates(pool, { ...none, card: "ds" }, card()))).toEqual(["Runs it"]);
  });
});

describe("withinBracket: the commander and the card alone", () => {
  it("puts a Game Changer commander outside 1 and 2 and inside 3", () => {
    const gc = cmd({ name: "GC", gameChanger: true });
    expect(withinBracket(gc, null, 2)).toBe(false);
    expect(withinBracket(gc, null, 3)).toBe(true);
  });

  it("counts the build-around card against the limits too", () => {
    expect(withinBracket(cmd({ name: "Plain" }), card({ gameChanger: true }), 2)).toBe(false);
    expect(withinBracket(cmd({ name: "Plain" }), card(), 1)).toBe(true);
  });

  it("puts a two-card combo the pair completes outside 2, and a turn loop outside 3", () => {
    expect(withinBracket(cmd({ name: "Combo", combosWithCard: { combos: 1, loops: 0 } }), card(), 2)).toBe(false);
    expect(withinBracket(cmd({ name: "Combo", combosWithCard: { combos: 1, loops: 0 } }), card(), 3)).toBe(true);
    expect(withinBracket(cmd({ name: "Loop", combosWithCard: { combos: 1, loops: 1 } }), card(), 3)).toBe(false);
  });

  it("puts a plain extra-turn commander outside 1 only", () => {
    expect(withinBracket(cmd({ name: "T", extraTurn: true }), null, 1)).toBe(false);
    expect(withinBracket(cmd({ name: "T", extraTurn: true }), null, 2)).toBe(true);
  });

  it("admits everything at 4 and 5, which state no limits", () => {
    expect(withinBracket(cmd({ name: "MLD", massLandDenial: true }), null, 4)).toBe(true);
  });
});

describe("withinBudget: the commander's price and an unowned card's", () => {
  it("adds an unowned card's price to an unowned commander's", () => {
    expect(withinBudget(cmd({ name: "C", priceCents: 6000 }), card({ priceCents: 5000 }), 110)).toBe(true);
    expect(withinBudget(cmd({ name: "C", priceCents: 6000 }), card({ priceCents: 5000 }), 109)).toBe(false);
  });

  it("charges nothing for what the player owns", () => {
    expect(withinBudget(cmd({ name: "C", owned: true, priceCents: 90_000 }), card({ owned: true, priceCents: 90_000 }), 1)).toBe(true);
  });

  it("passes a price that was never stocked, which it cannot test", () => {
    expect(withinBudget(cmd({ name: "C", priceCents: null }), null, 1)).toBe(true);
  });
});

describe("too narrow (ruling 8)", () => {
  const pool = [
    ...["A", "B", "C", "D", "E"].map((name) => cmd({ name, colorIdentity: ["G"], tags: [tag("elves", 300)] })),
    cmd({ name: "Dino", colorIdentity: ["R", "G"], tags: [tag("dinos", 300)] }),
  ];

  it("names what each answer removes, most freeing first", () => {
    const r = rankCandidates(pool, { ...none, colors: ["R"], themes: ["dinos"] }, null);
    expect(names(r)).toEqual(["Dino"]);
    expect(r.tooNarrow?.without).toEqual([
      { answer: { kind: "colors" }, count: 1 },
      { answer: { kind: "theme", slug: "dinos" }, count: 1 },
    ]);
    const r2 = rankCandidates(pool, { ...none, themes: ["dinos"], budgetDollars: 1, colors: ["G"] }, null);
    expect(r2.tooNarrow?.without[0]).toEqual({ answer: { kind: "theme", slug: "dinos" }, count: 6 });
  });

  it("is not raised when enough pass, or when nothing was asked", () => {
    expect(rankCandidates(pool, { ...none, themes: ["elves"] }, null).tooNarrow).toBeNull();
    expect(rankCandidates(pool.slice(0, 2), none, null).tooNarrow).toBeNull();
  });
});
