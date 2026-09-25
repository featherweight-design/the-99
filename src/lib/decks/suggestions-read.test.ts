import { describe, expect, it } from "vitest";
import { OWNED_POOL_PROJECTION, STAPLE_PROJECTION, unownedAppend } from "./suggestions-read";
import { SHELF_CAP } from "./shelf-cap";

/**
 * `layout` decides whether a card can take a land drop (`playableAsLand`), and its absence is
 * SILENT: a pool query that drops the column leaves every `FillCandidate.layout` undefined,
 * every modal land invisible to the land count, and every other test green. The required field
 * on `FillCandidate` catches a dropped mapping; only this catches a dropped column.
 */
describe("the fill's pool projections", () => {
  it("selects layout for owned cards", () => {
    expect(Object.keys(OWNED_POOL_PROJECTION)).toContain("layout");
  });

  it("selects layout for unowned staples", () => {
    // Both halves, because the fill reads one pool for cards you own and another for the
    // staples it would buy, and a modal land can arrive through either.
    expect(Object.keys(STAPLE_PROJECTION)).toContain("layout");
  });
});

// #391: the loader used to trim this to five while every shelf drew six, so the Top
// picks shelf was the one shelf that never reached the cap.
describe("unownedAppend", () => {
  it("offers the Top picks shelf the same cap as every other shelf", () => {
    const ranked = Array.from({ length: SHELF_CAP + 4 }, (_, i) => `staple-${i}`);
    expect(unownedAppend(ranked)).toEqual(ranked.slice(0, SHELF_CAP));
    expect(SHELF_CAP).toBe(6);
  });

  it("keeps the ranking order and a short list whole", () => {
    expect(unownedAppend(["a", "b"])).toEqual(["a", "b"]);
  });
});
