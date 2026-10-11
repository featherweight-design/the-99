import { describe, expect, it } from "vitest";
import { availabilityCopy } from "./availability";

describe("availabilityCopy", () => {
  // The free state must stay unnameable. If someone adds a `free:` key here,
  // this fails and they have to justify it.
  it("has no string for the free state", () => {
    expect(availabilityCopy.marker).not.toHaveProperty("free");
    expect(availabilityCopy.marker).not.toHaveProperty("freeAria");
  });

  it("names the claiming deck only in the singular form", () => {
    expect(availabilityCopy.marker.hardIn("Atraxa")).toBe("none free, in Atraxa");
    expect(availabilityCopy.marker.hardMulti(3)).toBe(
      "none free, across 3 decks",
    );
  });

  // Over-commitment is a count problem, not a location problem. The clause now
  // reads "also in N decks", so the old " in " proxy would fail on wording that
  // is still counting rather than naming — assert the absent proper noun.
  it("never names a deck in the over state", () => {
    expect(availabilityCopy.marker.over(2)).not.toMatch(/in |across /);
    expect(availabilityCopy.marker.overWithDemand(2, 3)).toBe(
      "short 2, also in 3 decks",
    );
    expect(availabilityCopy.marker.overWithDemand(2, 3)).not.toMatch(
      /in (?!\d)/,
    );
  });

  // One grammar for the over clause across the row and the tile, so a player
  // who learns it on one surface reads it on the other.
  it("says 'also in' wherever the over clause counts other claimants", () => {
    expect(availabilityCopy.marker.tileOver(1)).toBe("also in 1 deck");
    expect(availabilityCopy.marker.tileOver(2)).toBe("also in 2 decks");
    expect(availabilityCopy.marker.overAlsoIn(1, "Atraxa")).toBe(
      "short 1, also in Atraxa",
    );
  });

  it("singularises the soft marker, and says the same word out loud", () => {
    expect(availabilityCopy.marker.soft(1)).toBe("1 in a draft");
    expect(availabilityCopy.marker.soft(2)).toBe("2 in a draft");
    // BOTH FORMS, because the defect this vocabulary sweep fixed was that they
    // DISAGREED: the mark rendered "1 in a brew" and announced "1 copy is on an
    // unfinished deck", so a screen-reader user and a sighted user were told
    // different things about the same state. Asserting only the visible half
    // leaves the spoken half free to drift back.
    expect(availabilityCopy.marker.softAria(1)).toBe("1 copy is on a draft");
    expect(availabilityCopy.marker.softAria(2)).toBe("2 copies are on drafts");
    for (const n of [1, 2]) {
      expect(availabilityCopy.marker.soft(n)).toContain("draft");
      expect(availabilityCopy.marker.softAria(n)).toContain("draft");
    }
  });

  // "Deck tax" is banned vocabulary (it collides with commander tax), and most
  // of this module is functions — so JSON.stringify would silently skip nearly
  // all of it and pass on an empty check. Render every member instead, the same
  // way decks-builder.test.ts samples addPanelCopy for em dashes.
  const sample = (value: unknown, path: string): string[] => {
    if (typeof value === "string") return [value];
    if (typeof value === "object" && value !== null) {
      return Object.entries(value).flatMap(([k, v]) => sample(v, `${path}.${k}`));
    }
    if (typeof value !== "function") return [];

    // Members take names, counts, or a ranking mode. Try each shape: one call
    // would leave a singular/plural branch unrendered, and it is the branch
    // text, not the number, that could carry a banned phrase.
    const arity = value.length;
    const fills: unknown[][] = [
      ...[0, 1, 2].map((n) => Array.from({ length: arity }, () => n)),
      Array.from({ length: arity }, () => "x"),
      Array.from({ length: arity }, (_, i) => (i === 0 ? "x" : 2)),
      Array.from({ length: arity }, (_, i) => (i === 0 ? "free" : 2)),
    ];
    const rendered = fills.flatMap((args) => {
      try {
        return [String((value as (...a: unknown[]) => string)(...args))];
      } catch {
        return [];
      }
    });
    // A member no fill can call is a sampler that needs a new shape, not a
    // string that passed. Without this the check rots back into testing nothing.
    if (rendered.length === 0) {
      throw new Error(`${path} rendered under no argument shape, so it went unsampled.`);
    }
    return rendered;
  };

  it("banned vocabulary does not appear anywhere, functions included", () => {
    const strings = sample(availabilityCopy, "availabilityCopy");
    // Guards the guard: if a refactor ever empties the walk, this fails loudly
    // rather than passing vacuously the way JSON.stringify did.
    expect(strings.length).toBeGreaterThan(100);
    for (const s of strings) {
      expect(s, s).not.toMatch(/deck tax/i);
    }
  });

  // One deck can be the whole demand: "any number" cards (Relentless Rats,
  // Nazgûl) let a single list claim nine copies of something you own four of.
  // Every count string that can reach 1 has to survive it.
  it("reads correctly when exactly one deck is the whole demand", () => {
    expect(availabilityCopy.marker.tileOver(1)).toBe("also in 1 deck");
    expect(availabilityCopy.marker.overWithDemand(5, 1)).toBe(
      "short 5, also in 1 deck",
    );
    expect(availabilityCopy.marker.overAria(5, 1)).toBe(
      "1 of your decks includes this card and you own 5 too few",
    );
    expect(availabilityCopy.deckSummary.ariaLabel(1)).toBe(
      "1 card in this deck is over-committed",
    );
  });

  it("agrees its verbs with the count on the receipt and the disclosure", () => {
    expect(availabilityCopy.receipt.fit(1)).toBe("1 of your cards fits");
    expect(availabilityCopy.receipt.fitFree(1)).toBe("1 of your cards is free");
    expect(availabilityCopy.detail.disclosureAria(1)).toBe(
      "Show which 1 card is in use",
    );
    expect(availabilityCopy.ranking.announce("free", 1)).toBe(
      "Ranked from free cards only · 1 commander",
    );
  });

  // No count string may render a bare plural noun against a count of 1.
  it("never says a plural noun for a single thing", () => {
    const singulars = [
      availabilityCopy.marker.tileOver(1),
      availabilityCopy.marker.hardMulti(1),
      availabilityCopy.marker.overWithDemand(1, 1),
      availabilityCopy.receipt.fit(1),
      availabilityCopy.receipt.fitFree(1),
      availabilityCopy.detail.disclosureAria(1),
      availabilityCopy.detail.expandedFor(1),
      availabilityCopy.detail.announceExpanded(1),
      availabilityCopy.detail.announceCollapsed(1),
      availabilityCopy.deckSummary.ariaLabel(1),
      availabilityCopy.deckSummary.body("Nazgûl", 1, 1),
      availabilityCopy.ranking.announce("all", 1),
      availabilityCopy.deckRollup.softHeading(1),
    ];
    for (const s of singulars) {
      expect(s, s).not.toMatch(/\b1 (cards|decks|copies|lists|commanders)\b/);
    }
  });

  // The over-committed line renders in two places. If they ever stop being the
  // same function, one surface will quietly say something the other does not.
  it("uses one over-committed heading in both of its homes", () => {
    expect(availabilityCopy.deckRollup.overHeading).toBe(
      availabilityCopy.deckSummary.heading,
    );
    expect(availabilityCopy.deckSummary.heading(1)).toBe(
      "1 card here is spoken for twice",
    );
    expect(availabilityCopy.deckSummary.heading(4)).toBe(
      "4 cards here are spoken for twice",
    );
  });

  // The quick-add row's accessible name has exactly one home, in
  // decks-builder.ts. A second copy here is how the two drift apart.
  it("does not carry a second quick-add rowAria", () => {
    expect(availabilityCopy).not.toHaveProperty("rowAria");
  });
});

// Hugh, 2026-09-28: `short N` everywhere, `short 1` included, and a bare `short` at one copy on the
// deck page alone (`bareOne`). The aria strings keep the count, since a screen reader has no glyph.
describe("the short marker's count", () => {
  it("draws the count at one by default, in every over string", () => {
    expect(availabilityCopy.marker.over(1)).toBe("short 1");
    expect(availabilityCopy.marker.over(2)).toBe("short 2");
    expect(availabilityCopy.marker.overWithDemand(1, 2)).toBe("short 1, also in 2 decks");
    expect(availabilityCopy.marker.overAlsoIn(3, "Atraxa")).toBe("short 3, also in Atraxa");
  });

  it("drops it at one, and only at one, where the deck page asks", () => {
    expect(availabilityCopy.marker.over(1, true)).toBe("short");
    expect(availabilityCopy.marker.over(2, true)).toBe("short 2");
    expect(availabilityCopy.marker.overWithDemand(1, 2, true)).toBe("short, also in 2 decks");
    expect(availabilityCopy.marker.overAlsoIn(1, "Atraxa", true)).toBe("short, also in Atraxa");
  });

  it("still speaks the count at one", () => {
    expect(availabilityCopy.marker.overAriaCountOnly(1)).toContain("1 too few");
    expect(availabilityCopy.marker.overAria(1, 1)).toContain("1 too few");
  });

  // H21: the summary states the facts and stops. Pinned as LITERALS, because the builder
  // tests build their expectations from these same functions and would follow a restored tail.
  it("ends the deck summary on the facts, with no reassurance (H21)", () => {
    expect(availabilityCopy.deckSummary.body("Arcane Signet", 2, 1)).toBe(
      "Arcane Signet is on 2 committed decks and you own one.",
    );
    expect(availabilityCopy.deckSummary.bodyMany(3)).toBe(
      "3 of these are on more committed decks than you have copies.",
    );
  });
});
