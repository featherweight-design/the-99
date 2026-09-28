import { describe, expect, it } from "vitest";
import { CLAIM_BY } from "./accept";
import {
  buildProsePrompt,
  buildProseRetryPrompt,
  legacyProseInputHash,
  proseInputHash,
  shortName,
} from "./prompt";

const TAGS = [
  { slug: "spellslinger", label: "Spellslinger", count: 900 },
  { slug: "reanimator", label: "Reanimator", count: 400 },
];

describe("shortName", () => {
  it("drops the epithet after the comma", () => {
    expect(shortName("Kess, Dissident Mage")).toBe("Kess");
  });

  it("takes the front face of a split card", () => {
    expect(shortName("Gwen Stacy // Ghost-Spider")).toBe("Gwen Stacy");
  });

  // Both markers at once, and the one that matters is whichever comes first — this name is
  // 56 characters printed, one more than the entire claim budget.
  it("takes the front face before the epithet", () => {
    expect(shortName("Uvilda, Dean of Perfection // Nassari, Dean of Expression")).toBe("Uvilda");
  });

  it("leaves a name carrying neither marker alone", () => {
    expect(shortName("Urabrask the Hidden")).toBe("Urabrask the Hidden");
  });

  it("flattens a name carrying a line break", () => {
    expect(shortName("Urabrask\nthe Hidden")).toBe("Urabrask the Hidden");
  });
});

describe("buildProsePrompt", () => {
  it("names the commander in full and the subject in short", () => {
    const p = buildProsePrompt("Kess, Dissident Mage", TAGS);
    expect(p).toContain("Kess, Dissident Mage decks tend to play");
    expect(p).toContain('"Kess decks"');
  });

  // The version 1 failure. The prompt asked for an opening and a threshold whose arithmetic
  // it never did, so for most commanders it was asking for a sentence the contract rejects.
  // Doing the subtraction here is the fix, so the figure is pinned.
  it("states the characters left for the claim once the subject is spent", () => {
    // "Kess decks " is 11 characters of the 55.
    expect(buildProsePrompt("Kess, Dissident Mage", TAGS)).toContain(
      `leaving about ${CLAIM_BY - 11} characters for the claim`,
    );
  });

  it("leaves a long-named commander a smaller budget, not an impossible one", () => {
    // "Shang-Chi and the Ten Rings" carries no comma, so the subject stays long: 34
    // characters with " decks " and the trailing space. That leaves 21 — tight, but a claim
    // fits in 21 characters, where version 1's mandated "decks tend to" opening left 13.
    expect(buildProsePrompt("Shang-Chi and the Ten Rings", TAGS)).toContain(
      `leaving about ${CLAIM_BY - 34} characters for the claim`,
    );
  });

  it("lists the themes most common first", () => {
    expect(buildProsePrompt("Kess, Dissident Mage", TAGS)).toContain(
      "most common first: Spellslinger, Reanimator.",
    );
  });

  it("says so when there are no themes rather than listing none", () => {
    expect(buildProsePrompt("Kess, Dissident Mage", [])).toContain("No theme data is available");
  });

  // Every value the prompt names comes from outside this repo — the name from the catalog,
  // the labels from EDHREC — so a line break in any of them would read as an instruction.
  it("flattens the commander name and the theme labels onto their own lines", () => {
    const p = buildProsePrompt("Kess,\nDissident Mage", [
      { slug: "spellslinger", label: "Spell\nslinger", count: 900 },
    ]);
    expect(p).toContain("how Kess, Dissident Mage decks tend to play");
    expect(p).toContain("most common first: Spell slinger.");
  });
});

describe("buildProseRetryPrompt", () => {
  const rejected =
    "Urabrask the Hidden decks tend to overwhelm opponents early with haste-enabled aggro, usually backed by burn.";

  // Retrying the identical prompt returned byte-identical sentences three times over, so a
  // retry that does not carry the rejection back is three generations bought for one answer.
  it("differs from the first attempt's prompt", () => {
    expect(buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "front-loading")).not.toBe(
      buildProsePrompt("Urabrask the Hidden", TAGS),
    );
  });

  it("quotes the rejected string back", () => {
    expect(buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "front-loading")).toContain(
      rejected,
    );
  });

  // The rejected string is model output. Left raw, a reply carrying newlines would read as
  // fresh instructions rather than as the quotation it is.
  it("flattens a multi-line rejection onto one quoted line", () => {
    const messy = "  Kess decks grind,\n\n  leaning on the graveyard.  ";
    const p = buildProseRetryPrompt("Kess, Dissident Mage", TAGS, messy, "length");
    expect(p).toContain("It was:\nKess decks grind, leaning on the graveyard.");
    expect(p).not.toContain("\n\n  leaning");
  });

  // The rejected string is model output, so it can carry quotation marks of its own. Quoted
  // inline they would close the quoting early and the rest would read as fresh instruction.
  it("keeps a rejection carrying quotation marks on one line of its own", () => {
    const p = buildProseRetryPrompt(
      "Kess, Dissident Mage",
      TAGS,
      'Kess decks "grind", leaning on the graveyard.',
      "length",
    );
    expect(p).toContain('It was:\nKess decks "grind", leaning on the graveyard.');
  });

  it("names the rule that was broken, not just that one was", () => {
    const p = buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "front-loading");
    expect(p).toContain(`first comma, semicolon or em dash fell after character ${CLAIM_BY}`);
    expect(p).not.toContain("carried no hedge");
  });

  // The check measures any of a comma, a semicolon or an em dash, so advice naming only the
  // comma told a sentence broken by an em dash that its comma was late when it had none.
  it("names every break the front-loading check measures, not just the comma", () => {
    const p = buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "front-loading");
    expect(p).toContain("semicolon or em dash");
    expect(p).toContain("or it had none at all");
  });

  it("gives different advice for a different rule", () => {
    const p = buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "hedge");
    expect(p).toContain("carried no hedge");
  });

  it("keeps the whole first-attempt prompt, so the retry is still under every rule", () => {
    expect(buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "length")).toContain(
      buildProsePrompt("Urabrask the Hidden", TAGS),
    );
  });
});

describe("proseInputHash", () => {
  const KESS = "Kess, Dissident Mage";

  it("is stable for the same inputs", () => {
    expect(proseInputHash("oracle-kess", KESS, TAGS)).toBe(
      proseInputHash("oracle-kess", KESS, TAGS),
    );
  });

  it("ignores the order the tags arrive in, since it sorts by count", () => {
    expect(proseInputHash("oracle-kess", KESS, [...TAGS].reverse())).toBe(
      proseInputHash("oracle-kess", KESS, TAGS),
    );
  });

  it("moves when the tags move", () => {
    expect(proseInputHash("oracle-kess", KESS, TAGS)).not.toBe(
      proseInputHash("oracle-kess", KESS, [
        { slug: "aristocrats", label: "Aristocrats", count: 900 },
      ]),
    );
  });

  // A sentence has to open with the subject the name produces, so a card renamed under its
  // existing oracle id leaves a stored string naming a card that no longer exists.
  it("moves when the name moves under the same oracle id", () => {
    expect(proseInputHash("oracle-kess", KESS, TAGS)).not.toBe(
      proseInputHash("oracle-kess", "Kess, Dissident Magus", TAGS),
    );
  });

  // The prompt is built from the flattened label, so a label that differs only in the shape
  // of its whitespace is the same input and must not mark every row stale.
  it("ignores whitespace shape in a tag label", () => {
    expect(
      proseInputHash("oracle-kess", KESS, [{ slug: "s", label: "Spell\nslinger", count: 9 }]),
    ).toBe(proseInputHash("oracle-kess", KESS, [{ slug: "s", label: "Spell slinger", count: 9 }]));
  });

  // The top eight enter as a SET and the top three IN ORDER (2026-09-28): a reorder below the
  // lead changes neither what a sentence may name nor what it leads with.
  describe("the set-and-lead payload", () => {
    const EIGHT = ["a", "b", "c", "d", "e", "f", "g", "h"].map((slug, i) => ({
      slug,
      label: slug.toUpperCase(),
      count: 800 - i * 100,
    }));
    const withCounts = (counts: Record<string, number>) =>
      EIGHT.map((t) => ({ ...t, count: counts[t.slug] ?? t.count }));

    it("holds when two themes below the top three swap places", () => {
      const swapped = withCounts({ e: 350, f: 450 });
      expect(proseInputHash("o", KESS, swapped)).toBe(proseInputHash("o", KESS, EIGHT));
      expect(legacyProseInputHash("o", KESS, swapped)).not.toBe(legacyProseInputHash("o", KESS, EIGHT));
    });

    it("moves when two of the top three swap places", () => {
      expect(proseInputHash("o", KESS, withCounts({ b: 750, a: 700 }))).not.toBe(
        proseInputHash("o", KESS, EIGHT),
      );
    });

    it("moves when the third and fourth swap places", () => {
      expect(proseInputHash("o", KESS, withCounts({ c: 550, d: 650 }))).not.toBe(
        proseInputHash("o", KESS, EIGHT),
      );
    });

    it("moves when a theme leaves the top eight", () => {
      const ninth = [...EIGHT, { slug: "i", label: "I", count: 50 }];
      expect(proseInputHash("o", KESS, ninth)).toBe(proseInputHash("o", KESS, EIGHT));
      expect(proseInputHash("o", KESS, withCounts({ h: 10 }).concat({ slug: "i", label: "I", count: 50 })))
        .not.toBe(proseInputHash("o", KESS, EIGHT));
    });

    it("is not the legacy hash, so nothing reads a legacy stamp as current", () => {
      expect(proseInputHash("o", KESS, EIGHT)).not.toBe(legacyProseInputHash("o", KESS, EIGHT));
    });
  });
});
