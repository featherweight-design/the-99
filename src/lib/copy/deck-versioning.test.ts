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

  // A one-card draft is the commonest draft there is, so every count-carrying
  // string agrees with its own figure — noun and verb both.
  it("agrees with a figure of one across the module", () => {
    expect(copy.pending.since(1, 2)).toBe("1 change since v2");
    expect(copy.pending.reviewCta(1)).toBe("Review 1 change");
    expect(copy.pending.money(1, 4, 1, "$2.00")).toContain("1 of the 4 has no free copy");
    expect(copy.pending.moneyPulls(1)).toBe(
      "1 of those is sleeved in another deck and can be pulled instead.",
    );
    expect(copy.pending.toolbarNote(1, 3)).toBe("1 of these is not in v3 yet");
    expect(copy.review.heading(1, 2)).toBe("1 change since v2");
    expect(copy.review.outNote(1)).toMatch(/^it goes back in the pool/);
    expect(copy.review.footer(1, 0, 0)).toContain("1 card ·");
    expect(copy.commit.lede(2, 1, 1)).toContain(
      "The one card with no free copy keeps its buy tag until you actually buy it",
    );
    expect(copy.commit.lede(2, 1, 1)).toContain("the 1 you cut is back in the pool");
    expect(copy.commit.buyBackLink(1)).toBe("the 1 row is on the review page ↑");
    expect(copy.discard.question(1)).toBe("Discard 1 change?");
  });

  // The discard consequence names only the halves that moved: a cuts-only draft
  // saying "the 0 you added" states a change nobody made.
  it("names only the halves a discard actually loses", () => {
    const both = copy.discard.consequence(1, "12 Sep", 99, 2, 3);
    expect(both).toContain("The 2 you added and the 3 you cut are not stored anywhere");

    expect(copy.discard.consequence(1, "12 Sep", 99, 0, 3)).toContain(
      "The 3 you cut are not stored anywhere",
    );
    expect(copy.discard.consequence(1, "12 Sep", 99, 1, 0)).toContain(
      "The 1 you added is not stored anywhere",
    );
    // A basics-only draft is a real, committable change that names no card.
    expect(copy.discard.consequence(1, "12 Sep", 99, 0, 0)).toContain(
      "Nothing in this draft is stored anywhere",
    );
  });

  // A first commit, an all-free draft and a basics-only draft each leave one of the
  // lede's figures at zero, and a consequence nobody faces is not an explanation.
  it("names only the halves a commit actually has", () => {
    expect(copy.commit.lede(2, 0, 3)).toBe(
      "v2 becomes the deck's list immediately. The 3 you cut are back in the pool the moment you commit.",
    );
    expect(copy.commit.lede(2, 2, 0)).toBe(
      "v2 becomes the deck's list immediately. The 2 cards with no free copy keep their buy tags " +
        "until you actually buy them.",
    );
    expect(copy.commit.lede(1, 0, 0)).toBe("v1 becomes the deck's list immediately.");
  });

  it("caps the inline density at six", () => {
    // The banner's two densities hinge on this and nothing else reads it.
    expect(INLINE_CHANGE_MAX).toBe(6);
  });

  it("counts rows and copies separately in the money line", () => {
    // One card wanted three times is one unfree row and three copies to buy.
    expect(copy.pending.money(1, 4, 3, "$6.00")).toBe(
      "1 of the 4 has no free copy, so this commit will ask for 3 to buy · $6.00.",
    );
  });

  // The reader returns `total: null` when no requested copy carried a price, and
  // the pull that produced it still happened.
  it("announces a pull whose purchase could not be priced", () => {
    expect(copy.commit.pullAnnounced("Sol Ring", "Kykar", 2, "$6.00")).toBe(
      "Sol Ring pulled from Kykar. 2 to buy, $6.00.",
    );
    expect(copy.commit.pullAnnounced("Sol Ring", "Kykar", 2, null)).toBe(
      "Sol Ring pulled from Kykar. 2 to buy.",
    );
  });

  it("has no bucket headings and no second recount phrasing", () => {
    // R2 made availability a per-row treatment; Addendum R3 kept one phrasing
    // for "{name} {from} → {to}". Both deletions are load-bearing.
    expect("bucketFree" in copy.review).toBe(false);
    expect("recounted" in copy.review).toBe(false);
  });
});
