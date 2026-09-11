import { describe, expect, it } from "vitest";
import { changeCount, hasChanges, type DraftState } from "./draft-state";

const state = (over: Partial<DraftState> = {}): DraftState => ({
  version: null, adds: [], addChanges: [], removes: [], basicsChanged: false,
  names: new Map(), buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
  manaValue: null, manaValueBefore: null, ...over,
});

describe("changeCount / hasChanges", () => {
  it("counts adds and removes together", () => {
    expect(changeCount(state({
      adds: [{ oracleId: "a", needed: 1, shortfall: 1, bucket: "unowned", heldBy: [] }],
      removes: [{ oracleId: "r", from: 1, to: 0 }],
    }))).toBe(2);
  });

  it("counts a basics-only edit in no figure", () => {
    expect(changeCount(state({ basicsChanged: true }))).toBe(0);
  });

  it("still calls a basics-only edit a change — it has to be committable", () => {
    expect(hasChanges(state({ basicsChanged: true }))).toBe(true);
  });

  it("calls an untouched draft unchanged", () => {
    expect(hasChanges(state())).toBe(false);
  });
});
