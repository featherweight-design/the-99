import { describe, expect, it } from "vitest";
import type { Availability } from "../decks/availability";
import { commitmentFigures } from "./commitments";

const card = (a: Partial<Availability>): Availability => ({
  owned: 1,
  hard: 0,
  soft: 0,
  free: 1,
  claims: [],
  ...a,
});

describe("commitmentFigures", () => {
  it("counts copies claimed by finished decks, not cards", () => {
    // Two cards, one holding four hard copies — `Cards in use` is a copy count,
    // because its denominator is the collection's total copies.
    expect(
      commitmentFigures([card({ owned: 4, hard: 4, free: 0 }), card({ owned: 2, hard: 1, free: 1 })])
        .inUse,
    ).toBe(5);
  });

  it("ignores soft claims — a brew has not spoken for anything yet", () => {
    expect(commitmentFigures([card({ owned: 3, hard: 0, soft: 3, free: 3 })]).inUse).toBe(0);
  });

  it("counts a card as spoken for twice when finished decks want more than exist", () => {
    expect(
      commitmentFigures([
        card({ owned: 1, hard: 2, free: -1 }),
        card({ owned: 4, hard: 4, free: 0 }),
        card({ owned: 2, hard: 3, free: -1 }),
      ]).overCommitted,
    ).toBe(2);
  });

  it("counts cards, not copies, for the over-committed figure", () => {
    // The copy reads `3 cards`, so one card short by five copies is still one.
    expect(commitmentFigures([card({ owned: 1, hard: 6, free: -5 })]).overCommitted).toBe(1);
  });

  it("is zero over an empty collection", () => {
    expect(commitmentFigures([])).toEqual({ inUse: 0, overCommitted: 0 });
  });
});
