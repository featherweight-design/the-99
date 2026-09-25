import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HandOffAnswers } from "../../lib/intake/hand-off-load";
import { budgetLine, HandOffAnswersBlock } from "./hand-off-answers";

const CARD = "0000aaaa-0000-4000-8000-000000000001";
const card = (over: Partial<NonNullable<HandOffAnswers["card"]>> = {}) => ({
  oracleId: CARD, name: "Regisaur Alpha", owned: false, price: { kind: "priced", cents: 110 } as const, pct: 64, ...over,
});
const all: HandOffAnswers = {
  themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 91 }],
  card: card(),
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

  it("draws no row for an answer not given", () => {
    render(<HandOffAnswersBlock answers={{ themes: [], card: null, budgetDollars: null, bracket: 4 }} changeHref="/x" />);
    expect(screen.getAllByTestId("hand-off-row")).toHaveLength(1);
  });

  it("says what the budget does by the card it pays for first", () => {
    expect(budgetLine(card())).toMatch(/^Regisaur Alpha takes \$1\.10 of it first\./);
    expect(budgetLine(card({ price: { kind: "absent" } }))).toMatch(/^Regisaur Alpha has no price on record/);
    // An owned card costs the budget nothing, and no card at all leaves the budget to the fill alone.
    expect(budgetLine(card({ owned: true }))).toBe("The fill buys in its own order while the price fits, and finishes with basics.");
    expect(budgetLine(null)).toBe("The fill buys in its own order while the price fits, and finishes with basics.");
  });
});
