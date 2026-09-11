import { describe, expect, it } from "vitest";
import { INLINE_CHANGE_MAX, deckVersioningCopy as copy } from "./deck-versioning";

describe("deckVersioningCopy", () => {
  it("names the version the commit will create, not the one it replaces", () => {
    expect(copy.pending.commitCta(3)).toBe("Commit as v3");
  });

  it("draws a sign on a movement and a bare zero on none", () => {
    expect(copy.changed.delta(2)).toBe("+2");
    expect(copy.changed.delta(-2)).toBe("−2");
    expect(copy.changed.delta(0)).toBe("0");
  });

  it("uses a minus sign, never a hyphen, in a delta", () => {
    // U+2212. A hyphen in a mono figure reads as a word break at 10.5px.
    expect(copy.changed.delta(-2)).toContain("−");
    expect(copy.history.delta(3, 2)).toContain("−");
  });

  it("singularises a count of one", () => {
    expect(copy.history.heading(1)).toBe("1 version");
    expect(copy.history.heading(2)).toBe("2 versions");
    expect(copy.history.gamesHeld(1)).toContain("1 game");
  });

  it("caps the inline density at six", () => {
    // The banner's two densities hinge on this and nothing else reads it.
    expect(INLINE_CHANGE_MAX).toBe(6);
  });

  it("counts rows and copies separately in the money line", () => {
    // One card wanted three times is one unfree row and three copies to buy.
    expect(copy.pending.money(1, 4, 3, "$6.00")).toBe(
      "1 of the 4 have no free copy, so this commit will ask for 3 to buy · $6.00.",
    );
  });

  it("has no bucket headings and no second recount phrasing", () => {
    // R2 made availability a per-row treatment; Addendum R3 kept one phrasing
    // for "{name} {from} → {to}". Both deletions are load-bearing.
    expect("bucketFree" in copy.review).toBe(false);
    expect("recounted" in copy.review).toBe(false);
  });
});
