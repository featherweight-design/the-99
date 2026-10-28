// The Tuning History summary of a Proposed cuts run (small items 1): a run that named more than the deck needed says
// so as the result's foot does, never "6 of 3 named".
import { describe, expect, it } from "vitest";
import { tuningHubCopy } from "./tuning-hub";

const ok = tuningHubCopy.history.summary.cutsDeeperOk;

describe("the History summary of a Look deeper run", () => {
  it("names a pick run's rows against the cuts it was for", () => {
    expect(ok(6, 3, 3, 0)).toBe("6 named for 3 cuts · 3 cut");
    expect(ok(4, 1, 0, 0)).toBe("4 named for 1 cut");
  });

  it("reads a run that named what it needed, or fewer, as it shipped", () => {
    expect(ok(5, 6, 2, 1)).toBe("5 of 6 named · 2 cut, 1 kept");
    expect(ok(3, 3, 0, 0)).toBe("3 of 3 named");
  });
});
