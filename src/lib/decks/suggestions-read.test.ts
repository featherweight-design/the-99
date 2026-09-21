import { describe, expect, it } from "vitest";
import { OWNED_POOL_PROJECTION, STAPLE_PROJECTION } from "./suggestions-read";

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
