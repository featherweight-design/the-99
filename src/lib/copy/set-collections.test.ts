import { describe, expect, it } from "vitest";
import { setFilterCopy, setPageCopy, setsIndexCopy } from "./set-collections";

// Every template that takes a count has a singular and a plural, and the page's figures
// always state their own gap. These are the strings a wrong branch would ship silently.

describe("setsIndexCopy", () => {
  it("uses the singular for one held set", () => {
    expect(setsIndexCopy.subtitle(1)).toContain("1 set you hold cards in");
  });

  it("uses the plural and says newest first otherwise", () => {
    expect(setsIndexCopy.subtitle(34)).toContain("34 sets you hold cards in, newest first");
  });

  it("omits the new-to-you clause when every match is already held", () => {
    expect(setsIndexCopy.resultLine(3, 0)).toBe("3 collectible sets match");
  });

  it("states how many matches are new to you", () => {
    expect(setsIndexCopy.resultLine(3, 1)).toBe(
      "3 collectible sets match · 1 of them is new to you",
    );
  });

  it("counts one held set in the singular", () => {
    expect(setsIndexCopy.restLine(1, 40)).toBe("1 set · 40 cards");
    expect(setsIndexCopy.restLine(34, 1200)).toBe("34 sets · 1,200 cards");
  });

  it("has a not-indexed tag that is never a percentage", () => {
    expect(setsIndexCopy.notIndexed.tag).toBe("not indexed yet");
    expect(setsIndexCopy.notIndexed.tag).not.toMatch(/\d/);
  });
});

describe("setPageCopy.cost", () => {
  it("states the priced-of-missing gap rather than a bare total", () => {
    expect(setPageCopy.cost.line(193, 214)).toBe("over 193 of the 214 missing");
  });

  it("uses the singular when one card has never been stocked", () => {
    expect(setPageCopy.cost.unpriced(1))
      .toBe("1 has never been stocked and is not in this figure");
  });

  it("uses the plural otherwise", () => {
    expect(setPageCopy.cost.unpriced(21))
      .toBe("21 have never been stocked and are not in this figure");
  });

  it("does not call a sold-out card one that was never stocked", () => {
    expect(setPageCopy.cost.soldOut(1)).toBe("1 is sold out and is not in this figure");
    expect(setPageCopy.cost.soldOut(3)).toBe("3 are sold out and are not in this figure");
  });

  it("labels the one selector with its own count", () => {
    expect(setPageCopy.cost.send(1)).toBe("Send 1 to ManaPool");
    expect(setPageCopy.cost.send(193)).toBe("Send 193 to ManaPool");
  });

  it("re-scopes to the extras rather than naming a different verb", () => {
    expect(setPageCopy.cost.labelExtras).toBe("Cost to finish the extras");
    expect(setPageCopy.cost.lineExtras(98, 105)).toBe("over 98 of the 105 you are missing");
  });
});

describe("setPageCopy states", () => {
  it("says the missing-only skip out loud rather than drawing gaps", () => {
    expect(setPageCopy.result.missingOnly(214)).toContain("numbers skip");
  });

  it("treats zero under missing-only as good news", () => {
    expect(setPageCopy.zeroResults.headingOwnsAll("rares"))
      .toBe("You are not missing any rares");
    expect(setPageCopy.zeroResults.bodyOwnsAll(1, "Duskmourn")).toContain("you hold it");
  });

  it("closes a complete set with no extras rather than a zero ratio", () => {
    expect(setPageCopy.complete.noExtras).toBe("Nothing left in this set");
    expect(setPageCopy.complete.extrasCount(0, 96)).toBe("Extras 0 / 96");
  });

  it("names the delta for this set alone after an upload", () => {
    expect(setPageCopy.staleAfterUpload.line(1)).toContain("1 more card from this set");
    expect(setPageCopy.staleAfterUpload.line(17)).toContain("17 more cards from this set");
  });

  it("names the code a wrong link asked for", () => {
    expect(setPageCopy.unknownCode.heading("zzz")).toBe("No set with the code ZZZ");
  });
});

describe("setFilterCopy", () => {
  it("counts filters for the phone sheet badge", () => {
    expect(setFilterCopy.countBadgeAria(1)).toBe("1 filter on");
    expect(setFilterCopy.countBadgeAria(3)).toBe("3 filters on");
  });

  // H13: rarity is multi-select and its trigger COUNTS, as `/collection`'s Type does, so the
  // `Rarity · all` / `Rarity · uncommon` pair retired with the single-select control.
  it("counts on the rarity trigger, as Type does", () => {
    expect(setFilterCopy.rarityPanel.triggerLabel).toBe(setFilterCopy.rarity.label);
    expect(setFilterCopy.rarityPanel.triggerCount(0)).toBe("Rarity 0");
    expect(setFilterCopy.rarityPanel.triggerCount(1)).toBe("Rarity 1");
    expect(setFilterCopy.rarityPanel.triggerCount(2)).toBe("Rarities 2");
  });

  // H12: the chip reads the control's own words, for both options.
  it("names each ownership option on its chip with the control's label", () => {
    expect(setFilterCopy.chip.own("missing")).toBe(setFilterCopy.ownership.missing.label);
    expect(setFilterCopy.chip.own("owned")).toBe(setFilterCopy.ownership.owned.label);
  });

  it("states an owned-only result as the owned count", () => {
    expect(setPageCopy.result.ownedOnly(1)).toMatch(/^1 yours ·/);
  });

  it("names every rarity it offers as a chip", () => {
    for (const key of Object.keys(setFilterCopy.rarity.options) as
      ("common" | "uncommon" | "rare" | "mythic")[]) {
      expect(setFilterCopy.chip.rarity(key)).toBe(setFilterCopy.rarity.options[key]);
    }
  });
});

// Swept as a class rather than patched where flagged: five formatters in this file printed
// a bare plural that a count of one can reach. The noun agrees with the figure that governs
// it, which for a ratio is the DENOMINATOR — `0 / 1 extra`, not `0 / 1 extras`.
describe("set-collections copy — counts of one", () => {
  // The noun agrees with the denominator, which is what it counts. Every other plural in
  // this file carries an explicit singular; these shipped without.
  it("says extra when the set has one", () => {
    expect(setsIndexCopy.row.extrasLine(0, 1)).toBe("0 / 1 extra");
    expect(setsIndexCopy.row.extrasLine(1, 1)).toBe("1 / 1 extra");
    expect(setsIndexCopy.row.extrasAria(1, 1)).toBe(", and 1 of 1 extra");
  });

  it("says extras otherwise", () => {
    expect(setsIndexCopy.row.extrasLine(4, 123)).toBe("4 / 123 extras");
    expect(setsIndexCopy.row.extrasAria(4, 123)).toBe(", and 4 of 123 extras");
  });

  it("captions a set with one extra printing", () => {
    expect(setPageCopy.head.meta("eoe", "2026", 276, 1)).toContain("1 extra");
    expect(setPageCopy.head.meta("eoe", "2026", 276, 1)).not.toContain("1 extras");
    expect(setPageCopy.head.meta("eoe", "2026", 276, 4)).toContain("4 extras");
  });

  it("names a one-card base run in the ratio's accessible text", () => {
    expect(setPageCopy.head.ratioAria(0, 1)).toBe("You have 0 of 1 card in the base run");
    expect(setPageCopy.head.ratioAria(1, 2)).toBe("You have 1 of 2 cards in the base run");
  });

  it("counts one cell as a cell", () => {
    expect(setPageCopy.result.rest(1, 1, 0)).toBe("1 cell · 1 yours, 0 missing");
    expect(setPageCopy.result.rest(2, 1, 1)).toBe("2 cells · 1 yours, 1 missing");
  });

  it("counts a one-cell filtered population the same way", () => {
    expect(setPageCopy.result.filtered(1, 1)).toBe("1 of 1 cell");
    expect(setPageCopy.result.filtered(1, 2)).toBe("1 of 2 cells");
  });

  it("sends one missing card, not one missing cards", () => {
    expect(setPageCopy.cost.sendAria(1, "$2.00")).toContain("1 missing card,");
    expect(setPageCopy.cost.sendAria(2, "$4.00")).toContain("2 missing cards,");
  });

  // Reachable the moment a collection holds one card, which is every collection's first
  // state: `1 set · 1 cards`.
  it("counts a one-card collection", () => {
    expect(setsIndexCopy.restLine(1, 1)).toBe("1 set · 1 card");
    expect(setsIndexCopy.restLine(1, 2)).toBe("1 set · 2 cards");
    expect(setsIndexCopy.restLine(3, 1200)).toBe("3 sets · 1,200 cards");
  });

  // Two are deliberately left as they are, and this records why so the next sweep does not
  // re-litigate them.
  it("leaves the two that are already correct alone", () => {
    // `sendCappedAria` only renders past the 99-card cap, so `n` can never be 1.
    expect(setPageCopy.cost.sendCappedAria(99)).toContain("first 99 missing cards");
    // `missingOnly` reads "1 missing", which is adjectival and correct.
    expect(setPageCopy.result.missingOnly(1)).toMatch(/^1 missing ·/);
  });
});
