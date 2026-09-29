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

describe("the ledger's pass label", () => {
  // `top-off 1` beside `50 cards you chose…` read as a count of one (Hugh, 2026-09-28).
  it("names the pass by an ordinal word, never a bare numeral after the noun", () => {
    const label = topOffCopy.ledger.passLabel;
    expect(["1", "2", "3", "4", "11", "12", "13", "21", "22", "103"].map(label)).toEqual([
      "1st top-off", "2nd top-off", "3rd top-off", "4th top-off", "11th top-off",
      "12th top-off", "13th top-off", "21st top-off", "22nd top-off", "103rd top-off",
    ]);
  });
});
