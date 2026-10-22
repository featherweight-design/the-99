import { describe, expect, it } from "vitest";

import { answerColumnsFor, validateCreateAnswers } from "./answers";

const ok = { themes: ["Dinosaurs"], cardOracleId: null, budgetDollars: 150, bracket: 3, bracketBuys: false };
const UUID = "6ad8011d-3471-4369-9d68-b264cc027487";

describe("validateCreateAnswers", () => {
  it("passes a well-formed set, trimming theme labels", () => {
    expect(validateCreateAnswers({ ...ok, themes: [" Dinosaurs "], cardOracleId: UUID }))
      .toEqual({ themes: ["Dinosaurs"], themeJoin: "all", sets: [], pool: "any", cardOracleId: UUID, budgetDollars: 150, bracket: 3, bracketBuys: false });
    expect(validateCreateAnswers({ ...ok, sets: ["hob", "hoc"] }).sets).toEqual(["hob", "hoc"]);
    expect(() => validateCreateAnswers({ ...ok, sets: ["HOB"] })).toThrow("sets");
    expect(validateCreateAnswers({ ...ok, themes: ["Orcs", "Elves"], themeJoin: "any" }).themeJoin).toBe("any");
  });

  it("refuses what a crafted request could carry", () => {
    expect(() => validateCreateAnswers({ ...ok, budgetDollars: 0 })).toThrow("budget");
    expect(() => validateCreateAnswers({ ...ok, budgetDollars: 99.5 })).toThrow("budget");
    expect(() => validateCreateAnswers({ ...ok, bracket: 0 })).toThrow("bracket");
    expect(() => validateCreateAnswers({ ...ok, bracket: 2.5 })).toThrow("bracket");
    expect(() => validateCreateAnswers({ ...ok, cardOracleId: "not-a-uuid" })).toThrow("card");
    expect(() => validateCreateAnswers({ ...ok, themes: ["a\nb"] })).toThrow("themes");
    expect(() => validateCreateAnswers({ ...ok, themeJoin: "some" as unknown as "any" })).toThrow("themes");
    expect(() => validateCreateAnswers({ ...ok, themes: Array(9).fill("x") })).toThrow("themes");
    expect(() => validateCreateAnswers({ ...ok, themes: "Dinosaurs" as unknown as string[] })).toThrow("themes");
  });
});

describe("answerColumnsFor", () => {
  it("stores the budget in cents, with no intent written any more (H35)", () => {
    expect(answerColumnsFor(validateCreateAnswers(ok), { oracleId: UUID, name: "Doubling Season" })).toEqual({
      answerBudgetCents: 15_000, answerBracket: 3, answerCardOracleId: UUID, answerOwnedOnly: false, answerBracketBuys: false,
    });
  });

  it("stores own-only", () => {
    const cols = answerColumnsFor(validateCreateAnswers({ ...ok, cardOracleId: null, pool: "own" }), null);
    expect(cols.answerOwnedOnly).toBe(true);
    expect(() => validateCreateAnswers({ ...ok, pool: "mine" as unknown as "own" })).toThrow("pool");
  });

  it("keeps Hit bracket N only with a bracket of 3 or more, and refuses a non-boolean", () => {
    expect(validateCreateAnswers({ ...ok, bracketBuys: true }).bracketBuys).toBe(true);
    expect(answerColumnsFor(validateCreateAnswers({ ...ok, bracketBuys: true }), null).answerBracketBuys).toBe(true);
    expect(validateCreateAnswers({ ...ok, bracket: 2, bracketBuys: true }).bracketBuys).toBe(false);
    expect(validateCreateAnswers({ ...ok, bracket: null, bracketBuys: true }).bracketBuys).toBe(false);
    // An older client sends none: not asked.
    expect(validateCreateAnswers({ ...ok, bracketBuys: undefined as unknown as boolean }).bracketBuys).toBe(false);
    expect(() => validateCreateAnswers({ ...ok, bracketBuys: "yes" as unknown as boolean })).toThrow("bracket choice");
  });

  it("records no card when the create refused it", () => {
    expect(answerColumnsFor(validateCreateAnswers({ ...ok, cardOracleId: UUID }), null).answerCardOracleId).toBeNull();
  });
});
