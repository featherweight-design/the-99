import { describe, expect, it } from "vitest";

import { answerColumnsFor, validateCreateAnswers } from "./answers";

const ok = { themes: ["Dinosaurs"], cardOracleId: null, budgetDollars: 150, bracket: 3 };
const UUID = "6ad8011d-3471-4369-9d68-b264cc027487";

describe("validateCreateAnswers", () => {
  it("passes a well-formed set, trimming theme labels", () => {
    expect(validateCreateAnswers({ ...ok, themes: [" Dinosaurs "], cardOracleId: UUID }))
      .toEqual({ themes: ["Dinosaurs"], themeJoin: "all", sets: [], pool: "any", cardOracleId: UUID, budgetDollars: 150, bracket: 3 });
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
  it("stores the budget in cents and writes the answers as a seeded brief", () => {
    expect(answerColumnsFor(validateCreateAnswers(ok), { oracleId: UUID, name: "Doubling Season" }, ["Gishath, Sun's Avatar"])).toEqual({
      answerBudgetCents: 15_000, answerBracket: 3, answerCardOracleId: UUID, answerOwnedOnly: false,
      intent: "Built around Gishath, Sun's Avatar: Dinosaurs, with Doubling Season, under $150, bracket 3.",
      intentSeeded: true,
    });
  });

  it("stores own-only, and the brief says where the 99 comes from", () => {
    const cols = answerColumnsFor(validateCreateAnswers({ ...ok, cardOracleId: null, pool: "own" }), null, ["Thorin"]);
    expect(cols.answerOwnedOnly).toBe(true);
    expect(cols.intent).toBe("Built around Thorin: Dinosaurs, the 99 from cards you own, under $150, bracket 3.");
    expect(() => validateCreateAnswers({ ...ok, pool: "mine" as unknown as "own" })).toThrow("pool");
  });

  it("records no card when the create refused it", () => {
    expect(answerColumnsFor(validateCreateAnswers({ ...ok, cardOracleId: UUID }), null, ["Gishath"]).answerCardOracleId).toBeNull();
  });
});
