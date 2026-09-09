import { describe, expect, it } from "vitest";
import { topOffCopy } from "./top-off";
import { deckBodySize } from "../decks/deck-size";

// #364. Every string on this surface that prints a deck total takes the ceiling
// as an argument rather than spelling 99, because a pair's commanders take two
// of the hundred and its body is 98. One case per string: a written-down 99
// anywhere here would tell a pair player their finished deck is one card short.
describe("topOffCopy — the deck ceiling", () => {
  const single = deckBodySize(false);
  const pair = deckBodySize(true);

  it("prints the pair's ceiling on the commit control", () => {
    expect(topOffCopy.commit.addAria("2", "98", pair)).toContain("98 of 98");
    expect(topOffCopy.commit.addAria("2", "98", single)).toContain("98 of 99");
  });

  it("prints the pair's ceiling in the consequence line", () => {
    expect(topOffCopy.commit.consequence("98", pair)).toBe("98 of 98 when added");
    expect(topOffCopy.commit.consequence("98", single)).toBe("98 of 99 when added");
  });

  it("prints the pair's ceiling in the three announcements", () => {
    expect(topOffCopy.announce.added("2", "98", "1", pair)).toContain("98 of 98");
    expect(topOffCopy.announce.addedNoBuy("2", "98", pair)).toContain("98 of 98");
    expect(topOffCopy.announce.undone("2", "96", pair)).toContain("96 of 98");
  });
});
