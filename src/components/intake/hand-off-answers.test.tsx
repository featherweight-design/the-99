import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HandOffAnswers } from "../../lib/intake/hand-off-load";
import { budgetLine, HandOffAnswersBlock } from "./hand-off-answers";

const CARD = "0000aaaa-0000-4000-8000-000000000001";
const card = (over: Partial<NonNullable<HandOffAnswers["card"]>> = {}) => ({
  oracleId: CARD, name: "Regisaur Alpha", imageUri: "https://img.test/regisaur.jpg", owned: false, held: null, price: { kind: "priced", cents: 110 } as const, pct: 64, ...over,
});
const all: HandOffAnswers = {
  themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 91 }],
  card: card(),
  cardUnread: false,
  themeJoin: "all",
  sets: [],
  pool: "any",
  budgetDollars: 150,
  bracket: 2,
};

describe("Built from your answers", () => {
  it("draws one row per answer, in the form's order, each with its consequence", () => {
    render(<HandOffAnswersBlock answers={all} changeHref="/decks/new/choose?t=dinosaurs" />);
    const rows = screen.getAllByTestId("hand-off-row").map((r) => r.textContent);
    expect(rows).toEqual([
      "ThemeDinosaurs91% of its decks are Dinosaurs.",
      expect.stringMatching(/^Built aroundRegisaur Alpha.*Placed in the deck because you asked for it\. 64% of its decks run it\.$/),
      "Budget$150Regisaur Alpha takes $1.10 of it first. The fill buys the rest in its own order while the price fits, and finishes with basics.",
      "Bracket2 · CoreThe fill keeps every card it chooses inside bracket 2’s limits.",
    ]);
    expect(within(screen.getByTestId("hand-off-answers")).getByRole("link", { name: "Change your answers" }).getAttribute("href"))
      .toBe("/decks/new/choose?t=dinosaurs");
  });

  it("draws themes asked as any of as one row, its line the best figure", () => {
    const any: HandOffAnswers = {
      ...all,
      card: null,
      budgetDollars: null,
      bracket: null,
      themeJoin: "any",
      themes: [
        { slug: "orcs", label: "Orcs", pct: null },
        { slug: "elves", label: "Elves", pct: 11 },
        { slug: "wizards", label: "Wizards", pct: 44, best: true },
      ],
    };
    render(<HandOffAnswersBlock answers={any} changeHref="/x" />);
    expect(screen.getAllByTestId("hand-off-row").map((r) => r.textContent)).toEqual(["Any ofOrcs, Elves or Wizards44% of its decks are Wizards."]);
  });

  it("draws the sets as one row of their names", () => {
    render(<HandOffAnswersBlock answers={{ ...all, card: null, budgetDollars: null, bracket: null, themes: [], sets: [{ code: "hob", name: "The Hobbit" }, { code: "hoc", name: "The Hobbit Commander" }] }} changeHref="/x" />);
    expect(screen.getAllByTestId("hand-off-row").map((r) => r.textContent)).toEqual(["Printed inThe Hobbit or The Hobbit Commander"]);
  });

  it("draws own-only as a row, and says the budget buys nothing for the 99", () => {
    render(<HandOffAnswersBlock answers={{ ...all, card: null, themes: [], bracket: null, pool: "own" }} changeHref="/x" />);
    expect(screen.getAllByTestId("hand-off-row").map((r) => r.textContent)).toEqual([
      "The 99From cards you ownIt takes only cards with a copy free, and finishes with basics.",
      "Budget$150The fill buys nothing for the 99.",
    ]);
  });

  it("draws no row for an answer not given", () => {
    render(<HandOffAnswersBlock answers={{ themes: [], themeJoin: "all", sets: [], pool: "any", card: null, cardUnread: false, budgetDollars: null, bracket: 4 }} changeHref="/x" />);
    expect(screen.getAllByTestId("hand-off-row")).toHaveLength(1);
  });

  it("says what the budget does by the card it pays for first", () => {
    expect(budgetLine(card())).toMatch(/^Regisaur Alpha takes \$1\.10 of it first\./);
    expect(budgetLine(card({ price: { kind: "absent" } }))).toMatch(/^Regisaur Alpha has no price on record/);
    // An owned card costs the budget nothing, and no card at all leaves the budget to the fill alone.
    expect(budgetLine(card({ owned: true }))).toBe("The fill buys in its own order while the price fits, and finishes with basics.");
    expect(budgetLine(null)).toBe("The fill buys in its own order while the price fits, and finishes with basics.");
    // The card's read failed: the create still pays for it first, so no line is true yet.
    expect(budgetLine(null, true)).toBeNull();
    // Owned with every copy held: the fill buys it, so the budget pays for it first.
    const held = card({ owned: true, held: { deck: "Atraxa" } });
    expect(budgetLine(held)).toMatch(/^Regisaur Alpha takes \$1\.10 of it first\./);
    expect(budgetLine(held, false, true)).toBe("Regisaur Alpha takes $1.10 of it. The fill buys nothing else for the 99.");
    // Own-only: nothing is bought for the 99, unless the card is the one buy.
    expect(budgetLine(null, false, true)).toBe("The fill buys nothing for the 99.");
    expect(budgetLine(card({ owned: true }), false, true)).toBe("The fill buys nothing for the 99.");
    expect(budgetLine(card(), false, true)).toBe("Regisaur Alpha takes $1.10 of it. The fill buys nothing else for the 99.");
    expect(budgetLine(card({ price: { kind: "absent" } }), false, true)).toMatch(/^Regisaur Alpha has no price on record.*nothing else/);
  });
});
