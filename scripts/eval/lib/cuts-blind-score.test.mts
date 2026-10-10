import { describe, expect, it } from "vitest";

import { scoreSources, type BlindKey } from "./cuts-blind-score.mjs";

const card = (sources: string[]) => ({ deck: "D", oracleId: "x", name: "x", sources, hughCut: false });

describe("scoreSources", () => {
  const cards: BlindKey["cards"] = {
    a: card(["model"]), b: card(["model", "free"]), c: card(["free"]), d: card(["random"]), e: card(["random", "model"]),
  };

  it("scores precision, recall in the pool and lift over random, a shared card counting for both", () => {
    const rows = scoreSources(cards, { a: "cut", b: "cut", c: "maybe", d: "keep", e: "cut" });
    const by = Object.fromEntries(rows.map((r) => [r.source, r]));
    expect(by.model).toMatchObject({ picks: 3, cut: 3, precision: 1, recall: 1 });
    expect(by.free).toMatchObject({ picks: 2, cut: 1, maybe: 1, precision: 0.5, lenient: 0.75, recall: 1 / 3 });
    expect(by.random).toMatchObject({ picks: 2, cut: 1, keep: 1, precision: 0.5 });
    expect(by.model.lift).toBe(2);
    expect(by.random.lift).toBe(1);
  });

  it("leaves a Key card out of random's picks, the pool the model could cut from", () => {
    const withKey: BlindKey["cards"] = { ...cards, k: { ...card(["random"]), keyCard: true } };
    const by = Object.fromEntries(scoreSources(withKey, { a: "cut", d: "keep", e: "cut", k: "keep" }).map((r) => [r.source, r]));
    expect(by.random).toMatchObject({ picks: 2, keep: 1, precision: 0.5 });
  });

  it("skips unrated cards and reports no lift when random cut nothing", () => {
    const rows = scoreSources(cards, { a: "cut", d: "keep" });
    const by = Object.fromEntries(rows.map((r) => [r.source, r]));
    expect(by.model).toMatchObject({ rated: 1, precision: 1 });
    expect(by.free).toMatchObject({ rated: 0, precision: null });
    expect(by.model.lift).toBeNull();
  });
});
