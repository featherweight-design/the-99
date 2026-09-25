import { describe, expect, it } from "vitest";

import { emptyParams, type ChooseParams } from "./params";
import { answerChips, figures, narrowOptions, orderLine } from "./present";
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
  const ask = p({ colors: ["r", "g"], match: "exactly", themes: ["dinos"], card: "c", bracket: 2 });
  const narrow = {
    without: [
      { answer: { kind: "card" as const }, count: 40 },
      { answer: { kind: "theme" as const, slug: "dinos" }, count: 12 },
      { answer: { kind: "colors" as const }, count: 9 },
      { answer: { kind: "bracket" as const }, count: 0 },
    ],
    widen: { count: 24 },
    cardOverBracket: "gameChanger" as const,
  };

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
      { kind: "exactly", value: "Red · Green" },
      { kind: "theme", value: "Dinosaurs" },
      { kind: "card", value: "Regisaur Alpha" },
      { kind: "budget", value: "$150" },
      { kind: "bracket", value: "2 · Core" },
    ]);
  });
});
