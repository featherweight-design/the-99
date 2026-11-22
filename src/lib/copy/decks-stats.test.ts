import { describe, expect, it } from "vitest";
import { decksStatsCopy } from "./decks-stats";

describe("decksStatsCopy.worth.age", () => {
  it("rounds before it picks a unit, so a figure never prints the next unit's threshold", () => {
    const age = decksStatsCopy.worth.age;
    expect([age(0.2), age(59.4), age(59.6), age(130), age(47.4 * 60), age(47.6 * 60), age(37 * 1440)]).toEqual(["1m ago", "59m ago", "1h ago", "2h ago", "47h ago", "2d ago", "37d ago"]);
  });
});

// Store choice (#3200): the two value captions name the reader's store, in its own figure's words.
describe("decksStatsCopy value captions", () => {
  it("names Mana Pool's prices, and TCGplayer's as market prices", async () => {
    const { STORE_INFO } = await import("../stores/info");
    expect(decksStatsCopy.worth.caption(STORE_INFO.manapool, "2h ago")).toBe("Mana Pool prices, 2h ago");
    expect(decksStatsCopy.worth.caption(STORE_INFO.tcgplayer, "2h ago")).toBe("TCGplayer market prices, 2h ago");
    expect(decksStatsCopy.collection.caption(STORE_INFO.tcgplayer, "1d ago", 3, 5)).toBe("Basics not counted · 3 of 5 copies priced · TCGplayer market prices, 1d ago");
    expect(decksStatsCopy.collection.caption(STORE_INFO.manapool, null, 5, 5)).toBe("Basics not counted");
  });
});
