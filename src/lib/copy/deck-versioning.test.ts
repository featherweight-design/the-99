import { describe, expect, it } from "vitest";
import { addPanelCopy } from "./decks-builder";
import { INLINE_CHANGE_MAX, deckVersioningCopy as copy } from "./deck-versioning";

describe("deckVersioningCopy", () => {
  // The first-commit lede says what committing does to copies, in the app's words: it uses
  // copies, and the deck that has held one longest keeps it. "Claiming" is the model's verb.
  it("states what a first commit does to copies, without the claim verb", () => {
    const lede = copy.review.firstLede;
    expect(lede).toContain("starts using copies from your collection");
    expect(lede).toContain("the deck that has held it longest keeps it");
    expect(lede.toLowerCase()).not.toContain("claim");
  });

  it("names the version the commit will create, not the one it replaces", () => {
    expect(copy.pending.commitCta(3)).toBe("Commit as v3");
  });

  // Pinned literally, not derived: each of these four was cut down from something
  // longer, and every other test on them reads a substring the long form also
  // contained, so a regression to the long form would stay green.
  it("states the shortened strings in full", () => {
    // "Except the pulls" is gone: a pull is no longer the only decision here — Put back restores
    // a cut, and a contested row gives a copy away. Naming all three would make the sentence a
    // list, so it names none.
    // No promise about undoing: true of a pick and a put-back, false of a pull, which cuts
    // another deck a version and cannot be taken back.
    expect(copy.review.lede(2)).toBe(
      "The deck page already shows this list: this is what it costs to lock in as v2.",
    );
    expect(copy.review.outNote(3)).toBe(
      "all 3 go back in the pool when you commit. Put one back and it never left.",
    );
    // The singular arm survives the second sentence: the handoff writes the
    // replacement in its plural head only, and "all 1 go back" is not English.
    expect(copy.review.outNote(1)).toBe(
      "it goes back in the pool when you commit. Put one back and it never left.",
    );
    // H31 retired `diffNote`: the rows now carry today's figures, and this line says so.
    expect(copy.history.todayNote(3)).toBe("ownership and prices are today’s, not v3’s");
    expect(copy.history.partialOwned(1, 4)).toBe("has 1 of 4");
    expect(copy.history.partialA11y(1, 4)).toBe("This deck has 1 of the 4 this version runs");
    expect(copy.history.initialBody).toBe(
      "the first list, with nothing before it to compare against.",
    );
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
    expect(copy.pending.money(1, 4, 1, "$2.00")).toContain("1 of the 4 is short of spare copies");
    expect(copy.pending.moneyPulls(1)).toBe(
      "1 of those is sleeved in another deck and can be pulled instead.",
    );
    expect(copy.pending.toolbarNote(1, 3)).toBe("1 of these differs from v3");
    expect(copy.review.heading(1, 2)).toBe("1 change since v2");
    expect(copy.review.outNote(1)).toMatch(/^it goes back in the pool/);
    expect(copy.review.footer(1, 0, 0)).toContain("1 card ·");
    expect(copy.commit.lede(2, 1, 1)).toContain(
      "The one card short of spare copies keeps its buy tag until you actually buy it",
    );
    expect(copy.commit.lede(2, 1, 1)).toContain("the 1 you cut is back in the pool");
    expect(copy.commit.buyBackLink(1)).toBe("the 1 row is on the review page ↑");
    expect(copy.discard.question(1)).toBe("Discard 1 change?");
  });

  // There is no zero branch on any of these. There used to be, for the draft
  // that moved only basic lands and so named no card; those lands are rows now,
  // and `hasChanges` is `changeCount > 0`, so a sheet that is up has at least
  // one change to count.
  it("counts the changes it is discarding", () => {
    expect(copy.discard.confirm(1)).toBe("Discard 1 change");
    expect(copy.discard.announced(36, 2)).toBe("36 changes discarded. Back to v2.");
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
  });

  // A first commit, an all-free draft and a basics-only draft each leave one of the
  // lede's figures at zero, and a consequence nobody faces is not an explanation.
  it("names only the halves a commit actually has", () => {
    expect(copy.commit.lede(2, 0, 3)).toBe(
      "v2 becomes the deck’s list immediately. The 3 you cut are back in the pool the moment you commit.",
    );
    expect(copy.commit.lede(2, 2, 0)).toBe(
      "v2 becomes the deck’s list immediately. The 2 cards short of spare copies keep their buy tags " +
        "until you actually buy them.",
    );
    expect(copy.commit.lede(1, 0, 0)).toBe("v1 becomes the deck’s list immediately.");
  });

  it("caps the inline density at six", () => {
    // The banner's two densities hinge on this and nothing else reads it.
    expect(INLINE_CHANGE_MAX).toBe(6);
  });

  it("counts rows and copies separately in the money line", () => {
    // One card wanted three times is one unfree row and three copies to buy.
    expect(copy.pending.money(1, 4, 3, "$6.00")).toBe(
      "1 of the 4 is short of spare copies, so this commit will ask for 3 to buy · $6.00.",
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

  // The restore's own strings. There is no refusal string and that is a ruling
  // rather than an omission — a restore is an add, and adds never refuse on
  // claims — so the guard that matters is that `failed` describes a write that
  // did not happen rather than a card that did not move.
  describe("restore", () => {
    it("names the card in the accessible name, because the label repeats", () => {
      expect(copy.restore.ctaA11y("Mox Diamond")).toBe("Put Mox Diamond back in the deck");
      expect(copy.restore.cta).toBe("Put back");
    });

    // Two features on two surfaces, ratified at R2. A later tidy-up that
    // unified them would be reverting a decision rather than removing a
    // duplicate.
    it("keeps its own word, not #185’s", () => {
      expect(copy.restore.cta).not.toBe(addPanelCopy.undo.action);
    });

    // The card is OUT and the restore is what failed. The removal's fallback
    // says the opposite, which is why this string exists at all.
    it("says the card is still going out when the write fails", () => {
      expect(copy.restore.failed).toContain("going out");
      expect(copy.restore.failed).not.toContain("still in the deck");
    });

    // No count of nought is ever drawn, including in an announcement.
    it("has a sentence for the last cut that draws no nought", () => {
      expect(copy.restore.announcedLastOut("Mox", 100)).not.toMatch(/\b0\b/);
      expect(copy.restore.announced("Mox", 100, 3)).toContain("3 going out");
    });
  });
});

describe("the breakdown’s fourth term", () => {
  it("is absent at zero, so today’s line is unchanged", () => {
    expect(copy.review.groupInBreakdown(3, 2, 1)).toBe("3 free · 2 sleeved · 1 to buy");
    expect(copy.review.groupInBreakdown(3, 2, 1, 0)).toBe("3 free · 2 sleeved · 1 to buy");
  });

  it("accounts for printed rows when there are any", () => {
    // Ruling 9: three terms that stop summing to the group's own count read as a
    // rendering fault, and a printed row is in none of them.
    expect(copy.review.groupInBreakdown(3, 2, 1, 1))
      .toBe("3 free · 2 sleeved · 1 to buy · 1 proxied");
  });
});

describe("a proxy-only commit is not 'enough spare copies'", () => {
  it("says the cards are proxies instead", () => {
    // `moneyNone` asserts a spare copy in the collection. A printed card has no
    // copy anywhere, so that sentence is the one claim about where cardboard is
    // that this vocabulary forbids.
    expect(copy.pending.moneyProxiedOnly(1))
      .toBe("1 card coming in is a proxy, so this commit asks for nothing.");
    expect(copy.pending.moneyProxiedOnly(3))
      .toBe("3 cards coming in are proxies, so this commit asks for nothing.");
  });
});
