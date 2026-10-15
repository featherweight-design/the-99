import { describe, expect, it } from "vitest";
import { collapsible, firstPaintCss } from "./announced-collapse";

describe("collapsible", () => {
  it("collapses only past two rows of the grid's columns: 4 stay whole at two columns, 5 fold", () => {
    expect(collapsible(4, 2, false)).toBe(false);
    expect(collapsible(5, 2, false)).toBe(true);
  });
  it("follows the columns: 12 stay whole at six, 13 fold", () => {
    expect(collapsible(12, 6, false)).toBe(false);
    expect(collapsible(13, 6, false)).toBe(true);
  });
  it("never collapses while a filter is on, nor before the columns are known", () => {
    expect(collapsible(15, 2, true)).toBe(false);
    expect(collapsible(15, 0, false)).toBe(false);
  });
});

describe("firstPaintCss", () => {
  it("draws nothing for a set no width folds (4 or fewer)", () => {
    expect(firstPaintCss("trc", 4)).toBe("");
    expect(firstPaintCss("trc", 1)).toBe("");
  });
  it("hides tiles past the first two below 480px, scoped to the set and off once measured", () => {
    const css = firstPaintCss("trc", 15);
    expect(css).toContain('@media (max-width: 479.98px) { [data-collapse="trc"]:not([data-measured]) > li:nth-child(n+3)');
  });
  it("steps with the container at each column floor, up to the columns that keep the set whole", () => {
    const css = firstPaintCss("trc", 15); // whole at 8 columns: 2 x 8 >= 15
    // 150px floor, 10px gap: 3 columns need 3 * 160 - 10 = 470px; 178px floor, 12px gap: 4 need 4 * 190 - 12 = 748px.
    expect(css).toContain("@container (max-width: 469.98px) {");
    expect(css).toContain("li:nth-child(n+3)");
    expect(css).toContain("@container (max-width: 747.98px) {");
    // No step past the 8th column: a 15-tile set is whole from there.
    expect(css).not.toContain("li:nth-child(n+9)");
    expect(css).toContain("li:nth-child(n+8)");
  });
});
