import { describe, expect, it } from "vitest";

import { emptyParams, type ChooseParams } from "./params";
import { answerChips, readForThisAsk, verifiedDeeperMarks, figures, narrowOptions, orderLine } from "./present";
import type { ResultRow } from "./rows";

const labels = { theme: (s: string) => ({ dinos: "Dinosaurs", tokens: "Tokens" })[s] ?? s, card: "Regisaur Alpha" };
const p = (over: Partial<ChooseParams> = {}): ChooseParams => ({ ...emptyParams(), results: true, ...over });
const row = (over: Partial<ResultRow> = {}): ResultRow => ({
  oracleId: "x", name: "X", colorIdentity: ["R"], imageUri: null, artCropUri: null, mark: { kind: "free" },
  themeFits: [], cardFit: null, ownedSupport: 0, supportTotal: 0, ...over,
});

describe("orderLine", () => {
  it("names the one answer that ranks, or says every answer does", () => {
    expect(orderLine("fit", p({ themes: ["dinos"] }), labels).title).toBe("Ordered by Dinosaurs");
    expect(orderLine("fit", p({ themes: ["dinos"], card: "c" }), labels).title).toBe("Ordered by fit to everything you asked");
    expect(orderLine("owned", p(), labels).title).toBe("Ordered by cards you already have");
    expect(orderLine("owned", p(), labels).sub).toMatch(/^You gave no theme or card, so these are commanders, owned or not,/);
    expect(orderLine("owned", p({ colors: ["r", "g"] }), labels).sub).toMatch(/^You gave colors but no theme or card, so these are Red and Green commanders, owned or not,/);
    // A card the catalog could not name leaves nothing to cite, and never an "undefined".
    expect(orderLine("fit", p({ card: "c" }), { ...labels, card: null })).toEqual({ title: "Ordered by fit to everything you asked", sub: "" });
  });
});

describe("figures", () => {
  it("lights the weakest figure and tags it, dimming the rest", () => {
    const f = figures(row({ themeFits: [{ slug: "dinos", share: 0.4 }], cardFit: 0.12 }), "fit", labels);
    expect(f).toEqual([
      { pct: 40, text: "of its decks are Dinosaurs", setsRank: false, dim: true },
      { pct: 12, text: "of its decks run Regisaur Alpha", setsRank: true, dim: false },
    ]);
  });

  it("tags every figure tied for weakest", () => {
    const f = figures(row({ themeFits: [{ slug: "dinos", share: 0.3 }, { slug: "tokens", share: 0.3 }] }), "fit", labels);
    expect(f.map((x) => x.setsRank)).toEqual([true, true]);
  });

  it("gives one untagged figure on its own, and the owned count in the owned order", () => {
    expect(figures(row({ themeFits: [{ slug: "dinos", share: 0.5 }] }), "fit", labels)[0]).toMatchObject({ setsRank: false, dim: false });
    expect(figures(row({ ownedSupport: 268, supportTotal: 402 }), "owned", labels)[0]).toMatchObject({ pct: 268, text: "of the 402 cards its decks run are yours" });
  });
});

describe("narrowOptions", () => {
  it("names a several-answer removal as the drops, or as the one answer it keeps", () => {
    const four = p({ themes: ["orcs", "elves", "dwarves", "wizards"] });
    const tribal = { ...labels, theme: (s: string) => s[0].toUpperCase() + s.slice(1) };
    const t = (slug: string) => ({ kind: "theme" as const, slug });
    const opts = narrowOptions({
      without: [
        { answers: [t("orcs"), t("dwarves"), t("wizards")], count: 98 },
        { answers: [t("elves"), t("wizards")], count: 1 },
      ],
      widen: null,
      anyOf: null,
      cardOverBracket: null,
    }, four, tribal);
    expect(opts.map((o) => [o.label, o.count])).toEqual([["Keep only Elves", "98 commanders"], ["Drop Elves and Wizards", "1 commander"]]);
    // Each goes to the answers it names: every dropped theme gone, the rest kept, the read cleared.
    expect(opts[0].params.themes).toEqual(["elves"]);
    expect(opts[1].params.themes).toEqual(["orcs", "dwarves"]);
  });

  const ask = p({ colors: ["r", "g"], match: "exactly", themes: ["dinos"], card: "c", bracket: 2 });
  const narrow = {
    without: [
      { answers: [{ kind: "card" as const }], count: 40 },
      { answers: [{ kind: "theme" as const, slug: "dinos" }], count: 12 },
      { answers: [{ kind: "colors" as const }], count: 9 },
      { answers: [{ kind: "bracket" as const }], count: 0 },
    ],
    widen: { count: 24 },
    anyOf: null,
    cardOverBracket: "gameChanger" as const,
  };

  it("drops a deeper read and its marks from every option, since a new set of answers is a new ask", () => {
    const READ = "0000aaaa-0000-4000-8000-0000000000aa";
    // The look added the budget; dropping it must not hash back to the look's own ask.
    const after = p({ ...ask, budgetDollars: 150, readId: READ, deeper: ["b"] });
    for (const o of narrowOptions({ ...narrow, without: [...narrow.without, { answers: [{ kind: "budget" as const }], count: 30 }] }, after, labels)) {
      expect([o.params.readId, o.params.deeper]).toEqual([null, []]);
    }
  });

  it("offers at most three, most restoring first, and none that brings nothing back", () => {
    expect(narrowOptions(narrow, ask, labels).map((o) => o.label)).toEqual([
      "Drop Regisaur Alpha", "Any Red · Green, not exactly", "Drop Dinosaurs",
    ]);
  });

  it("gives the card's drop its reason, and each option the answers it goes to", () => {
    const [card, widen] = narrowOptions(narrow, ask, labels);
    expect(card.reason).toBe("Regisaur Alpha is a Game Changer, and bracket 2 allows none.");
    expect(card.params.card).toBeNull();
    expect(widen.params).toMatchObject({ match: "contains", colors: ["r", "g"] });
    expect(card.count).toBe("40 commanders");
  });
});

describe("answerChips", () => {
  it("lists every answer in the form's order", () => {
    expect(answerChips(p({ colors: ["g", "r"], match: "exactly", themes: ["dinos"], card: "c", budgetDollars: 150, bracket: 2 }), labels)).toEqual([
      { kind: "exactly", value: "Red · Green", deeper: false },
      { kind: "theme", value: "Dinosaurs", deeper: false },
      { kind: "card", value: "Regisaur Alpha", deeper: false },
      { kind: "budget", value: "$150", deeper: false },
      { kind: "bracket", value: "2 · Core", deeper: false },
    ]);
  });

  it("marks the answers a deeper look added, and nothing else", () => {
    const chips = answerChips(p({ themes: ["dinos"], card: "c", budgetDollars: 150, bracket: 2 }), labels, ["a", "k"]);
    expect(chips.map((c) => [c.kind, c.deeper])).toEqual([["theme", false], ["card", true], ["budget", false], ["bracket", true]]);
  });
});

describe("verifiedDeeperMarks", () => {
  const CARD = "0000aaaa-0000-4000-8000-000000000001";
  const read = { chips: [
    { kind: "theme", slug: "dinos", label: "Dinosaurs" },
    { kind: "card", oracleId: CARD, name: "Regisaur Alpha" },
    { kind: "budget", dollars: 150 },
    { kind: "bracket", bracket: 3 },
  ] as const };

  it("honors d only when r named the reader's own delivered read", () => {
    const q = p({ themes: ["dinos"], card: CARD, deeper: ["t:dinos", "a"] });
    expect(verifiedDeeperMarks(q, { kind: "read", read })).toEqual(["t:dinos", "a"]);
    expect(verifiedDeeperMarks(q, null)).toEqual([]);
    expect(verifiedDeeperMarks(q, { kind: "nothing", read })).toEqual([]);
  });

  it("marks only what that read gave and the answers still hold, so an appended d marks nothing", () => {
    const all = p({ themes: ["dinos", "tokens"], card: CARD, budgetDollars: 150, bracket: 3, deeper: ["t:dinos", "t:tokens", "a", "b", "k"] });
    // Tokens was never in the read: a forged mark.
    expect(verifiedDeeperMarks(all, { kind: "read", read })).toEqual(["t:dinos", "a", "b", "k"]);
    // The same r reused under other answers: the read gave $150 and bracket 3, not these.
    const moved = p({ budgetDollars: 90, bracket: 2, deeper: ["b", "k", "t:dinos"] });
    expect(verifiedDeeperMarks(moved, { kind: "read", read })).toEqual([]);
  });
});

describe("readForThisAsk", () => {
  const hash = (words: string, c: { budgetDollars: number | null; bracket: number | null }) => JSON.stringify([words, c.budgetDollars, c.bracket]);
  const read = { chips: [{ kind: "budget", dollars: 150 }] as const };

  it("honors the read for the ask it answered, recovering a budget it added as unset at the press", () => {
    const q = p({ words: "big lizards", budgetDollars: 150, deeper: ["b"] });
    const loaded = { kind: "read" as const, read, wordsHash: hash("big lizards", { budgetDollars: null, bracket: null }) };
    expect(readForThisAsk(q, loaded, hash)).toBe(loaded);
  });

  it("draws no finished look when r is carried onto other words or other controls", () => {
    const loaded = { kind: "read" as const, read, wordsHash: hash("big lizards", { budgetDollars: null, bracket: null }) };
    expect(readForThisAsk(p({ words: "tiny pirates", budgetDollars: 150, deeper: ["b"] }), loaded, hash)).toBeNull();
    expect(readForThisAsk(p({ words: "big lizards", budgetDollars: 150, bracket: 3, deeper: ["b"] }), loaded, hash)).toBeNull();
  });
});

describe("themes asked as any of", () => {
  const tribal = { ...labels, theme: (s: string) => s[0].toUpperCase() + s.slice(1) };
  const four = p({ themes: ["orcs", "elves", "dwarves", "wizards"] });
  const anyFour = { ...four, themeJoin: "any" as const };

  it("orders by the theme each fits best, naming the group", () => {
    expect(orderLine("fit", anyFour, tribal)).toEqual({
      title: "Ordered by the theme each fits best",
      sub: "You asked for any of Orcs, Elves, Dwarves or Wizards, so each commander ranks by the one it fits best. Every one it fits is shown.",
    });
    expect(orderLine("fit", { ...anyFour, card: "c" }, tribal)).toEqual({
      title: "Ordered by fit to everything you asked",
      sub: "Each commander ranks by the theme of Orcs, Elves, Dwarves or Wizards it fits best, or by Regisaur Alpha where that figure is lower.",
    });
  });

  it("tags the group's best figure and dims the other fits, never the weakest of the group", () => {
    const f = figures(row({ themeFits: [{ slug: "elves", share: 0.11 }, { slug: "wizards", share: 0.44, best: true }] }), "fit", tribal);
    expect(f.map((x) => [x.pct, x.setsRank, x.dim])).toEqual([[11, false, true], [44, true, false]]);
  });

  it("lets a card below the group's best set the rank instead", () => {
    const f = figures(row({ themeFits: [{ slug: "wizards", share: 0.44, best: true }], cardFit: 0.2 }), "fit", tribal);
    expect(f.map((x) => x.setsRank)).toEqual([false, true]);
  });

  it("offers the join first when all of found too few, with the measured reason", () => {
    const [widen] = narrowOptions({ without: [], widen: null, anyOf: { count: 98, most: 2 }, cardOverBracket: null }, four, tribal);
    expect(widen).toMatchObject({
      label: "Any of the four themes, not all",
      reason: "No commander fits more than two of Orcs, Elves, Dwarves and Wizards at once.",
      count: "98 commanders",
    });
    expect(widen.params.themeJoin).toBe("any");
  });

  it("gives no reason when no commander fits more than one of them", () => {
    const [widen] = narrowOptions({ without: [], widen: null, anyOf: { count: 12, most: 1 }, cardOverBracket: null }, four, tribal);
    expect(widen.reason).toBeNull();
  });

  it("drops the group whole, named as its chip names it", () => {
    const [drop] = narrowOptions({ without: [{ answers: [{ kind: "themes" }], count: 30 }], widen: null, anyOf: null, cardOverBracket: null }, anyFour, tribal);
    expect(drop.label).toBe("Drop any of Orcs, Elves, Dwarves or Wizards");
    expect(drop.params).toMatchObject({ themes: [], themeJoin: "all" });
  });

  it("draws one chip for the group, its names apart and its spoken name whole", () => {
    expect(answerChips(anyFour, tribal)).toEqual([{
      kind: "any of",
      value: "Orcs, Elves, Dwarves or Wizards",
      names: ["Orcs", "Elves", "Dwarves", "Wizards"],
      deeper: false,
    }]);
    expect(answerChips(four, tribal).map((c) => c.kind)).toEqual(["theme", "theme", "theme", "theme"]);
  });
});

describe("the join's reason", () => {
  const tribal = { ...labels, theme: (s: string) => s[0].toUpperCase() + s.slice(1) };
  it("is not given when some commander fits every theme asked", () => {
    const [widen] = narrowOptions({ without: [], widen: null, anyOf: { count: 40, most: 4 }, cardOverBracket: null },
      p({ themes: ["orcs", "elves", "dwarves", "wizards"] }), tribal);
    expect(widen.reason).toBeNull();
  });
});
