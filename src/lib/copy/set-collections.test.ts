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

  it("distinguishes an unknown code from a set with nothing to complete", () => {
    expect(setPageCopy.unknownCode.heading("zzz")).toBe("No set with the code ZZZ");
    expect(setPageCopy.nonCollectible.heading("Secret Lair Drop"))
      .toBe("Secret Lair Drop has no set to complete");
  });
});

describe("setFilterCopy", () => {
  it("counts filters for the phone sheet badge", () => {
    expect(setFilterCopy.countBadgeAria(1)).toBe("1 filter on");
    expect(setFilterCopy.countBadgeAria(3)).toBe("3 filters on");
  });

  it("carries a rarity letter for every rarity it offers", () => {
    for (const key of Object.keys(setFilterCopy.rarity.options)) {
      expect(setFilterCopy.rarity.letters).toHaveProperty(key);
    }
  });
});

describe("setsIndexCopy.row — the extras figure's plural", () => {
  // The noun agrees with the denominator, which is what it counts. Every other plural in
  // this file carries an explicit singular; this one shipped without.
  it("says extra when the set has one", () => {
    expect(setsIndexCopy.row.extrasLine(0, 1)).toBe("0 / 1 extra");
    expect(setsIndexCopy.row.extrasLine(1, 1)).toBe("1 / 1 extra");
    expect(setsIndexCopy.row.extrasAria(1, 1)).toBe(", and 1 of 1 extra");
  });

  it("says extras otherwise", () => {
    expect(setsIndexCopy.row.extrasLine(4, 123)).toBe("4 / 123 extras");
    expect(setsIndexCopy.row.extrasAria(4, 123)).toBe(", and 4 of 123 extras");
  });
});
