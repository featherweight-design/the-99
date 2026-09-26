import { describe, expect, it } from "vitest";

import { answerKeys, passes, rankCandidates, withinBracket, withinBudget, type Answers, type Candidate, type CardFacts } from "./rank";

const none: Answers = { colors: [], match: "contains", themes: [], card: null, budgetDollars: null, bracket: null };
const cmd = (over: Partial<Candidate> & { name: string }): Candidate => ({
  oracleId: over.name, colorIdentity: ["G"], deckCount: 1000, tags: [], typeLine: null,
  owned: false, priceCents: 100, cardInclusion: null, combosWithCard: { combos: 0, loops: 0 }, ownedSupport: 0, supportTotal: 0,
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
    expect(r.rows[0].themeFits).toEqual([{ slug: "dinos", share: 0.62, typeLine: false }]);
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
      { answers: [{ kind: "colors" }], count: 1 },
      { answers: [{ kind: "theme", slug: "dinos" }], count: 1 },
    ]);
    const r2 = rankCandidates(pool, { ...none, themes: ["dinos"], budgetDollars: 1, colors: ["G"] }, null);
    expect(r2.tooNarrow?.without[0]).toEqual({ answers: [{ kind: "theme", slug: "dinos" }], count: 6 });
  });

  it("drops the card from every test when the card is the answer removed", () => {
    // A Game Changer card at bracket 2 fails every commander on the card's own flag, and a price
    // over the budget fails them all again. Without the card, all pass.
    const r = rankCandidates(pool, { ...none, card: "gc", bracket: 2, budgetDollars: 10 },
      card({ oracleId: "gc", gameChanger: true, priceCents: 9_999 }));
    expect(r.rows).toEqual([]);
    expect(r.tooNarrow?.without.find((w) => w.answers.length === 1 && w.answers[0].kind === "card")?.count).toBe(pool.length);
  });

  it("offers to widen exact colors to any of them, with its count", () => {
    // Exactly green shuts out Dino, which is red and green; any-green lets it back.
    const r = rankCandidates(pool, { ...none, colors: ["G"], match: "exactly", themes: ["dinos"] }, null);
    expect(r.rows).toEqual([]);
    expect(r.tooNarrow?.widen).toEqual({ count: 1 });
    expect(rankCandidates(pool, { ...none, colors: ["R"], themes: ["dinos"] }, null).tooNarrow?.widen).toBeNull();
    // Red and green exactly already holds Dino, so any-red-and-green admits no one more.
    expect(rankCandidates(pool, { ...none, colors: ["R", "G"], match: "exactly", themes: ["dinos"] }, null).tooNarrow?.widen).toBeNull();
  });

  it("says when the build-around card alone is over a low bracket", () => {
    const gc = card({ oracleId: "gc", gameChanger: true });
    expect(rankCandidates(pool, { ...none, card: "gc", bracket: 2 }, gc).tooNarrow?.cardOverBracket).toBe("gameChanger");
    expect(rankCandidates(pool, { ...none, card: "gc", bracket: 3, themes: ["dinos"] }, gc).tooNarrow?.cardOverBracket).toBeNull();
  });

  it("is not raised when enough pass, or when nothing was asked", () => {
    expect(rankCandidates(pool, { ...none, themes: ["elves"] }, null).tooNarrow).toBeNull();
    expect(rankCandidates(pool.slice(0, 2), none, null).tooNarrow).toBeNull();
  });
});

describe("the too-narrow note never offers a dead end (Hugh, 2026-09-27)", () => {
  // Hugh's ask: four tribes at once. No commander backs all four, and dropping any ONE still
  // leaves three, which none back either, so every single removal reads 0.
  const tribes = ["orcs", "elves", "dwarves", "wizards"];
  const backer = (name: string, ...slugs: string[]) => cmd({ name, tags: slugs.map((s) => tag(s, 400)) });
  const pool = [
    backer("Elf A", "elves"), backer("Elf B", "elves"), backer("Elf C", "elves"), backer("Elf D", "elves"), backer("Elf E", "elves"),
    backer("Wizard A", "wizards"), backer("Wizard B", "wizards"), backer("Wizard C", "wizards"), backer("Wizard D", "wizards"),
    backer("Orc A", "orcs"), backer("Dwarf A", "dwarves"),
    backer("Orc Dwarf", "orcs", "dwarves"),
  ];
  const r = rankCandidates(pool, { ...none, themes: tribes }, null);

  it("finds nothing for all four, and offers them as any of, which brings every backer back", () => {
    expect(r.rows).toEqual([]);
    // One commander backs two of the four and none backs more: the reason the note gives.
    expect(r.tooNarrow!.anyOf).toEqual({ count: pool.length, most: 2 });
    // The join alone reaches the floor, so the search stops at single drops, which all read 0.
    expect(r.tooNarrow!.without).toEqual([]);
  });

  it("searches past single drops until a removal reaches enough, keeping the best first", () => {
    // Too few backers for the join to reach the floor, so the removal search goes on past singles.
    const thin = [backer("Elf A", "elves"), backer("Elf B", "elves"), backer("Orc Dwarf", "orcs", "dwarves")];
    const t = rankCandidates(thin, { ...none, themes: tribes }, null);
    expect(t.tooNarrow!.anyOf).toEqual({ count: 3, most: 2 });
    const [best] = t.tooNarrow!.without;
    // Dropping three and keeping Elves brings back the two Elves.
    expect(best.answers.map((a) => (a.kind === "theme" ? a.slug : a.kind))).toEqual(["orcs", "dwarves", "wizards"]);
    expect(best.count).toBe(2);
    // The pair that leaves Orcs and Dwarves finds the one commander backing both.
    expect(t.tooNarrow!.without.some((w) => w.answers.length === 2 && w.count === 1)).toBe(true);
    expect(t.tooNarrow!.without.every((w) => w.count > 0)).toBe(true);
  });

  it("stops at the first size that reaches the floor, never dropping every answer", () => {
    expect(r.tooNarrow!.without.every((w) => w.answers.length < tribes.length)).toBe(true);
    // Three themes where dropping one already reaches the floor: no pair is searched, although
    // pairs exist that would bring back more.
    const both = [1, 2, 3, 4].map((i) => backer(`Elf Wizard ${i}`, "elves", "wizards"));
    const three = rankCandidates([...both, backer("Orc A", "orcs")], { ...none, themes: ["elves", "wizards", "orcs"] }, null);
    expect(three.tooNarrow!.without).toEqual([{ answers: [{ kind: "theme", slug: "orcs" }], count: 4 }]);
    const two = rankCandidates(pool, { ...none, themes: ["elves", "wizards"] }, null);
    // Either single drop reaches the floor, so no pair is searched.
    expect(two.tooNarrow!.without.map((w) => w.answers.length)).toEqual([1, 1]);
  });

  it("still drops a lone answer, as before", () => {
    const one = rankCandidates(pool, { ...none, themes: ["orcs"] }, null);
    expect(one.tooNarrow!.without).toEqual([{ answers: [{ kind: "theme", slug: "orcs" }], count: pool.length }]);
  });
});

describe("a tribal theme is also backed by the type line", () => {
  const tribes = new Map([["dwarves", ["dwarves", "dwarf", "dwarfe", "dwarve"]]]);
  const measured = cmd({ name: "Measured", deckCount: 1000, tags: [tag("dwarves", 50)], typeLine: "Legendary Creature — Human Warrior" });
  const thin = cmd({ name: "Thin Dwarf", deckCount: 10, tags: [tag("dwarves", 8)], typeLine: "Legendary Creature — Dwarf Warrior" });
  const untagged = cmd({ name: "Untagged Dwarf", deckCount: 10, tags: [], typeLine: "Legendary Creature — Dwarf Noble" });
  const notDwarf = cmd({ name: "Thin Human", deckCount: 10, tags: [tag("dwarves", 8)], typeLine: "Legendary Creature — Human" });

  it("admits a thin commander whose type line is the tribe, and not one whose is not", () => {
    const r = rankCandidates([measured, thin, notDwarf], { ...none, themes: ["dwarves"] }, null, tribes);
    expect(names(r)).toEqual(["Measured", "Thin Dwarf"]);
  });

  it("ranks a measured backing above a type-line one, whatever the shares", () => {
    // Thin Dwarf's raw share is 80%, Measured's 5%: the measure still leads.
    const r = rankCandidates([thin, measured], { ...none, themes: ["dwarves"] }, null, tribes);
    expect(names(r)).toEqual(["Measured", "Thin Dwarf"]);
    expect(r.rows[1].themeFits[0]).toEqual({ slug: "dwarves", share: 0.8, typeLine: true });
  });

  it("never admits a type-line match whose figure would read 0%", () => {
    expect(names(rankCandidates([untagged], { ...none, themes: ["dwarves"] }, null, tribes))).toEqual([]);
    // 0.4% is a share, but it prints as 0%.
    const trace = cmd({ name: "Trace Dwarf", deckCount: 1000, tags: [tag("dwarves", 4)], typeLine: "Legendary Creature \u2014 Dwarf" });
    expect(names(rankCandidates([trace], { ...none, themes: ["dwarves"] }, null, tribes))).toEqual([]);
  });

  it("matches nothing on the type line for a theme that is not tribal", () => {
    expect(names(rankCandidates([thin], { ...none, themes: ["dwarves"] }, null))).toEqual([]);
  });
});

describe("the removal search is bounded", () => {
  it("searches single drops and then keeps one answer, skipping sizes too large to search", () => {
    // Twelve themes nobody backs together: 66 pairs is over the limit, so no pair is searched.
    const slugs = Array.from({ length: 12 }, (_, i) => `t${i}`);
    // One commander backs ten of them, so an unbounded search would offer the pair drop that
    // reaches it; the bounded one never searches pairs here. Three backers in all, so the join
    // stays under the floor and the removal search runs past single drops.
    const wide = cmd({ name: "Wide", tags: slugs.slice(0, 10).map((s) => tag(s, 400)) });
    const pool = [wide, cmd({ name: "t10", tags: [tag("t10", 400)] }), cmd({ name: "t11", tags: [tag("t11", 400)] })];
    const r = rankCandidates(pool, { ...none, themes: slugs }, null);
    expect(r.rows).toEqual([]);
    expect(new Set(r.tooNarrow!.without.map((w) => w.answers.length))).toEqual(new Set([11]));
    expect(r.tooNarrow!.without[0].count).toBe(1);
  });

  it("still offers keeping one answer when there are too many to search in between", () => {
    const slugs = Array.from({ length: 70 }, (_, i) => `t${i}`);
    const pool = [cmd({ name: "One", tags: [tag("t0", 400)] })];
    const r = rankCandidates(pool, { ...none, themes: slugs }, null);
    expect(r.tooNarrow!.without).toEqual([{ answers: slugs.slice(1).map((slug) => ({ kind: "theme", slug })), count: 1 }]);
  });
});

describe("themes asked as any of (three-answers addendum §1)", () => {
  const backer = (name: string, shares: Record<string, number>) =>
    cmd({ name, tags: Object.entries(shares).map(([s, n]) => tag(s, n)) });
  const pool = [
    backer("Elf lord", { elves: 800 }),
    backer("Wizard sage", { wizards: 500, elves: 100 }),
    backer("Orc chief", { orcs: 300 }),
    backer("Nothing", { goblins: 900 }),
  ];
  const any: Answers = { ...none, themes: ["orcs", "elves", "wizards"], themeJoin: "any" };

  it("passes a commander that fits one, and ranks by the one it fits best", () => {
    const r = rankCandidates(pool, any, null);
    expect(names(r)).toEqual(["Elf lord", "Wizard sage", "Orc chief"]);
    // Only the themes it fits are returned, and the best is marked.
    expect(r.rows[1].themeFits).toEqual([
      { slug: "elves", share: 0.1, typeLine: false },
      { slug: "wizards", share: 0.5, typeLine: false, best: true },
    ]);
  });

  it("takes the lowest across answers: the group's best, then the card", () => {
    const withCard = pool.map((c) => ({ ...c, cardInclusion: c.name === "Elf lord" ? 0.2 : 0.4 }));
    const r = rankCandidates(withCard, { ...any, card: "ds" }, card());
    // Elf lord: min(0.8, 0.2) = 0.2; Wizard sage: min(0.5, 0.4) = 0.4; Orc chief: min(0.3, 0.4) = 0.3.
    expect(names(r)).toEqual(["Wizard sage", "Orc chief", "Elf lord"]);
  });

  it("is all of below two themes, whatever the join says", () => {
    const one = rankCandidates(pool, { ...none, themes: ["elves"], themeJoin: "any" }, null);
    expect(names(one)).toEqual(["Elf lord", "Wizard sage"]);
    expect(answerKeys({ ...none, themes: ["elves"], themeJoin: "any" })).toEqual([{ kind: "theme", slug: "elves" }]);
  });

  it("is one answer to the note, dropped whole and never theme by theme", () => {
    expect(answerKeys(any)).toEqual([{ kind: "themes" }]);
    expect(passes(pool[3], any, null)).toBe(false);
    expect(passes(pool[3], any, null, [{ kind: "themes" }])).toBe(true);
  });

  it("offers no join when the themes already are any of, or are fewer than two", () => {
    const thin = [backer("Orc chief", { orcs: 300 })];
    expect(rankCandidates(thin, any, null).tooNarrow!.anyOf).toBeNull();
    expect(rankCandidates(thin, { ...none, themes: ["elves"] }, null).tooNarrow!.anyOf).toBeNull();
  });

  it("counts the join over the other answers, so it never offers a count the join cannot reach", () => {
    // All three backers are green; asking for blue leaves the join nothing to bring back.
    const r = rankCandidates(pool, { ...none, themes: ["orcs", "elves"], colors: ["U"], match: "exactly" }, null);
    expect(r.tooNarrow!.anyOf).toBeNull();
  });
});

describe("the join and the other answers", () => {
  it("with a join reaching the floor and another answer asked, still searches removals that include it", () => {
    // Themes x and y asked with blue, exactly. Two blue commanders back each, so the join finds
    // four and reaches the floor while no single drop does. Dropping blue and a theme finds the ten
    // green y commanders: more than the join, so the search must not stop at single drops.
    const pool = [
      ...[1, 2].map((i) => cmd({ name: `x${i}`, colorIdentity: ["U"], tags: [tag("x", 400)] })),
      ...[1, 2].map((i) => cmd({ name: `yu${i}`, colorIdentity: ["U"], tags: [tag("y", 400)] })),
      ...Array.from({ length: 10 }, (_, i) => cmd({ name: `yg${i}`, colorIdentity: ["G"], tags: [tag("y", 400)] })),
    ];
    const r = rankCandidates(pool, { ...none, themes: ["x", "y"], colors: ["U"], match: "exactly" }, null);
    expect(r.tooNarrow!.anyOf).toEqual({ count: 4, most: 1 });
    const [best] = r.tooNarrow!.without;
    expect(best.answers.map((k) => (k.kind === "theme" ? k.slug : k.kind)).sort()).toEqual(["colors", "x"]);
    expect(best.count).toBe(12);
  });
});
