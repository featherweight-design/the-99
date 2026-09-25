// The draft's commander, in the model every pending surface reads (plan decisions 3 and 4): a
// moved commander is one change, and a commander leaving the command zone releases its copy
// unless it traded into the 99.
import { describe, expect, it } from "vitest";
import { COMMITTED } from "../../components/decks/__fixtures__/draft-state";
import { changeCount, hasChanges, releasedCopies, type DraftState } from "../decks/draft-shape";
import type { DraftChange } from "../decks/draft-diff";

const single = (id: string) => ({ commanderOracleId: id, partnerOracleId: null });
const pair = (a: string, b: string) => ({ commanderOracleId: a, partnerOracleId: b });

function state(over: Partial<DraftState>): DraftState {
  return { ...COMMITTED, ...over };
}

const add = (oracleId: string, to = 1): DraftChange => ({ oracleId, from: 0, to });
const cut = (oracleId: string, from = 1, to = 0): DraftChange => ({ oracleId, from, to });

describe("changeCount with a commander", () => {
  it("is zero, and no change, when the commander did not move", () => {
    expect(changeCount(state({ commander: null }))).toBe(0);
    expect(hasChanges(state({ commander: null }))).toBe(false);
    // A fixture built before commanders could move carries no field at all.
    expect(changeCount(COMMITTED)).toBe(0);
  });

  it("counts a swap alone as one change", () => {
    const s = state({ commander: { from: single("korvold"), to: single("prosper") } });
    expect(changeCount(s)).toBe(1);
    expect(hasChanges(s)).toBe(true);
  });

  it("counts a pair swap as one change, however many halves moved", () => {
    const s = state({ commander: { from: pair("a", "b"), to: pair("c", "d") } });
    expect(changeCount(s)).toBe(1);
  });

  it("adds the move to the card rows", () => {
    const s = state({
      addChanges: [add("x")],
      adds: [{ ...add("x"), bucket: "free", shortfall: 0, needed: 1, heldBy: [] }],
      removes: [cut("y")],
      commander: { from: single("korvold"), to: single("prosper") },
    });
    expect(changeCount(s)).toBe(3);
  });
});

describe("releasedCopies with a commander", () => {
  it("releases the departing commander's copy", () => {
    const s = state({ commander: { from: single("korvold"), to: single("prosper") } });
    expect(releasedCopies(s)).toBe(1);
  });

  it("releases nothing for a commander that traded into the 99", () => {
    // The old commander is now an add row, which holds the same copy.
    const s = state({
      addChanges: [add("korvold")],
      commander: { from: single("korvold"), to: single("prosper") },
    });
    expect(releasedCopies(s)).toBe(0);
  });

  it("does not release the new commander's copy when it came out of the 99", () => {
    // Its remove row counted one released; it stays claimed, as the commander.
    const s = state({
      removes: [cut("prosper")],
      commander: { from: single("korvold"), to: single("prosper") },
    });
    expect(releasedCopies(s)).toBe(1);
  });

  it("counts a full trade as releasing nothing", () => {
    const s = state({
      addChanges: [add("korvold")],
      removes: [cut("prosper")],
      commander: { from: single("korvold"), to: single("prosper") },
    });
    expect(releasedCopies(s)).toBe(0);
  });

  it("releases only the half of a pair that left", () => {
    const s = state({ commander: { from: pair("a", "b"), to: pair("a", "c") } });
    expect(releasedCopies(s)).toBe(1);
  });

  it("releases both halves when a pair gives way to a single commander", () => {
    const s = state({ commander: { from: pair("a", "b"), to: single("c") } });
    expect(releasedCopies(s)).toBe(2);
  });

  it("keeps counting cut copies beside the commander", () => {
    const s = state({
      removes: [cut("y", 3, 1)],
      commander: { from: single("korvold"), to: single("prosper") },
    });
    expect(releasedCopies(s)).toBe(3);
  });
});
