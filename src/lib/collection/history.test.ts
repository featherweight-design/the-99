import { describe, expect, it } from "vitest";
import { revertDiffers } from "./history";

const id = { oracleId: "a", setCode: "lea", collectorNumber: "1", finish: "nonfoil" };
const row = (before: number | null, after: number | null) => ({
  ...id,
  before: before === null ? null : { quantity: before, scryfallId: null, condition: null },
  after: after === null ? null : { quantity: after, scryfallId: null, condition: null },
});

describe("revertDiffers", () => {
  it("is false when today's revert is the exact inverse of the entry", () => {
    // The entry added 3; nothing moved since, so the revert takes 3 away.
    expect(revertDiffers([row(1, 4)], [row(4, 1)])).toBe(false);
    expect(revertDiffers([row(2, null)], [row(null, 2)])).toBe(false);
  });

  it("is true when the collection moved and the revert can do less (brief §F)", () => {
    // The entry added 3 copies, 2 were removed since: the revert can take away only 1.
    expect(revertDiffers([row(null, 3)], [row(1, null)])).toBe(true);
  });

  it("is true when the revert has nothing left to do on a row the entry changed", () => {
    expect(revertDiffers([row(null, 3)], [])).toBe(true);
  });
});
