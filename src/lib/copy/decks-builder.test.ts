import { describe, expect, it } from "vitest";
import { addPanelCopy, builtFragment, shortCommanderName } from "./decks-builder";

describe("shortCommanderName", () => {
  it("takes the name up to the first comma", () => {
    expect(shortCommanderName("Korvold, Fae-Cursed King")).toBe("Korvold");
  });

  it("leaves a comma-less name alone", () => {
    expect(shortCommanderName("Sisay")).toBe("Sisay");
  });
});

describe("addPanelCopy.builderEmpty", () => {
  it("reproduces the handoff's single builder-empty caption verbatim", () => {
    expect(addPanelCopy.builderEmpty.caption("Korvold")).toBe(
      "Ninety-nine slots, zero filled. Type a name below, or take the ones we’ve already picked out. Korvold eats everything anyway.",
    );
  });

  // Standing guard against the defect class Design found unprompted: a string
  // naming a construct that exists at only one width. "below" is deliberately
  // not on this list — the quick-add bar really is below the copy at both
  // widths. What is banned is naming a column, a panel or a sheet.
  it("names no layout construct that exists at only one width", () => {
    const caption = addPanelCopy.builderEmpty.caption("Korvold").toLowerCase();
    for (const phrase of ["on the right", "on the left", "column", "panel", "sheet", "tap away"]) {
      expect(caption).not.toContain(phrase);
    }
  });

  it("serves one caption to both widths", () => {
    expect(addPanelCopy.builderEmpty).not.toHaveProperty("captionFor");
    expect(addPanelCopy.builderEmpty).not.toHaveProperty("captionForMobile");
  });

  // The sheet this opened no longer exists; the Consider tab and the quick-add
  // bar are both live entrances on the same screen.
  it("carries no CTA", () => {
    expect(addPanelCopy.builderEmpty).not.toHaveProperty("cta");
  });
});

// A deck of one card and a shelf of one suggestion are both ordinary states,
// and these are accessible names — a screen reader reads "1 cards" aloud.
describe("addPanelCopy counts at n = 1", () => {
  it("pluralises the tab accessible names", () => {
    expect(addPanelCopy.tabs.deckAria(1)).toBe("Your deck, 1 card");
    expect(addPanelCopy.tabs.deckAria(2)).toBe("Your deck, 2 cards");
    expect(addPanelCopy.tabs.considerAria(1)).toBe("Cards to consider, 1 suggestion");
    expect(addPanelCopy.tabs.considerAria(2)).toBe("Cards to consider, 2 suggestions");
  });

  it("pluralises the collection provenance line", () => {
    expect(addPanelCopy.consider.provenance(1)).toBe("1 card you already own");
    expect(addPanelCopy.consider.provenance(2)).toBe("2 cards you already own");
  });

  it("pluralises the show-all accessible name", () => {
    expect(addPanelCopy.consider.showAllAria("Ramp", 1)).toBe("Show all 1 Ramp suggestion");
    expect(addPanelCopy.consider.showAllAria("Ramp", 4)).toBe("Show all 4 Ramp suggestions");
  });

  it("keeps the handoff's existing match-count pattern", () => {
    expect(addPanelCopy.quickAdd.resultCountWithIdentity(1, "Jund")).toBe("1 match · Jund only");
    expect(addPanelCopy.quickAdd.resultCountWithIdentity(2, "Jund")).toBe("2 matches · Jund only");
  });

  it("names the role cell an add moved, and drops it when there is none", () => {
    expect(addPanelCopy.announce.added("Sol Ring", 12, "Ramp", 4, 10, 99)).toBe(
      "Sol Ring added · 12 of 99 · Ramp 4 of 10",
    );
    expect(addPanelCopy.announce.addedNoRole("Sol Ring", 12, 99)).toBe(
      "Sol Ring added · 12 of 99",
    );
  });

  // "104 of 99" is a range with no meaning, and the live region is the one
  // place the amber bar's second figure cannot do the explaining.
  it("stops saying 'of 99' once the deck is past it", () => {
    expect(addPanelCopy.announce.addedNoRole("Mountain", 104, 99)).toBe(
      "Mountain added · 104 cards, 5 over the 99",
    );
    expect(addPanelCopy.undo.announceRemoved("Mountain", 100, 99)).toBe(
      "Mountain removed · 100 cards, 1 over the 99 · undo available",
    );
    expect(builtFragment(99, 99)).toBe("99 of 99");
  });

  // A Partner deck's body is 98, and a reader hearing "of 99" beside a visible
  // "/ 98" is told the deck is one card further from legal than it is.
  it("measures a pair against 98, including the crossing point", () => {
    expect(builtFragment(98, 98)).toBe("98 of 98");
    expect(builtFragment(99, 98)).toBe("99 cards, 1 over the 98");
    expect(addPanelCopy.announce.addedNoRole("Mountain", 103, 98)).toBe(
      "Mountain added · 103 cards, 5 over the 98",
    );
    expect(addPanelCopy.undo.announceUndone("Sol Ring", 40, 98)).toBe(
      "Sol Ring back in the deck · 40 of 98",
    );
  });
});

// Named for the axis rather than for one key, because the provenance line lives
// under `consider` and the tag under `unowned`, and they only mean anything
// read together.
describe("addPanelCopy — the unowned axis", () => {
  it("states the axis rather than borrowing the deck's `to buy` phrasing", () => {
    expect(addPanelCopy.consider.provenanceWithUnowned(59, 5)).toBe("59 owned · 5 you don’t own");
    expect(addPanelCopy.consider.provenanceWithUnowned(59, 5)).not.toContain("to buy");
  });

  it("says unowned in a word as well as a colour", () => {
    expect(addPanelCopy.unowned.tag).toBe("buy");
    expect(addPanelCopy.unowned.tagAria("Smothering Tithe")).toBe(
      "Smothering Tithe is not in your collection",
    );
    expect(addPanelCopy.unowned.shelfCoverage).toBe("not in your collection");
  });

  // The tag, its aria and the shelf heading already carry ownership three
  // times over; a fourth line on the tile would restate them in a noun this
  // app does not have.
  it("carries no tile note", () => {
    expect(addPanelCopy.unowned).not.toHaveProperty("note");
  });
});

describe("addPanelCopy.tile evidence labels", () => {
  it("names the baseline the lift is measured against", () => {
    expect(addPanelCopy.tile.lift("31")).toBe("+31 pts vs. all decks");
  });

  it("labels the inclusion bar's source", () => {
    expect(addPanelCopy.tile.evidenceLabel).toBe("edhrec");
  });
});

// The addendum's whole copy pass was removing em dashes from this surface, so
// the invariant is worth pinning rather than re-auditing by eye. Scoped to
// addPanelCopy: the other exports in this file keep theirs.
describe("addPanelCopy punctuation", () => {
  const sample = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (typeof value === "function") {
      // Every function member takes strings or numbers and interpolates them.
      // Several branch on a count, so one call would leave the other branch
      // unsampled: `ownedFilterOffNote` writes its singular and plural forms
      // separately, and a dash could return to either alone. Call each member
      // once per fill so every count branch renders its literal frame.
      const arity = value.length;
      const counts = [0, 1, 2];
      // A uniform numeric fill throws on any member whose leading argument is a
      // name it lower-cases, so those members used to sample their string call
      // alone and their count branches went unvisited. The mixed shape — a name
      // first, counts after — is the call the app actually makes.
      const argLists: unknown[][] = [
        Array.from({ length: arity }, () => "x"),
        ...counts.map((n) => Array.from({ length: arity }, () => n)),
        ...counts.map((n) => Array.from({ length: arity }, (_, i) => (i === 0 ? "x" : n))),
      ];
      const rendered = argLists.flatMap((args) => {
        try {
          return [String((value as (...a: unknown[]) => string)(...args))];
        } catch {
          // A fill of the wrong shape for this member. It samples nothing rather
          // than failing the invariant on a call the app never makes; the other
          // shapes still render every literal frame in the member.
          return [];
        }
      });
      // Tolerating a shape that throws is the point; tolerating a member that
      // throws on every shape is how this whole invariant quietly stops testing
      // anything. A member the sampler cannot call at all is a sampler that
      // needs a new shape, not a string that passed.
      if (rendered.length === 0) {
        throw new Error(
          `addPanelCopy.${(value as { name?: string }).name || "(anonymous)"} rendered under no argument shape, so its strings went unsampled. Add the shape it takes.`,
        );
      }
      return rendered;
    }
    if (value && typeof value === "object") return Object.values(value).flatMap(sample);
    return [];
  };

  it("contains no em dash in any string", () => {
    // One documented exception: the rationale panel's four lines are quoted
    // design copy, not written for this surface, and the handoff says in as
    // many words that they ship as drawn and must not be "fixed". Everything
    // else — aria-labels included — obeys the rule.
    const { rationaleBodies, ...strip } = addPanelCopy.strip;
    expect(Object.values(rationaleBodies).every((line) => line.includes("—"))).toBe(true);
    for (const string of sample({ ...addPanelCopy, strip })) {
      expect(string).not.toContain("—");
    }
  });
});

describe("addPanelCopy.strip after #184", () => {
  // The hint is gone entirely. Every version of it generalised over the cells
  // ("a cell under target opens its shelf below"), and since #206 a role can be
  // under target with no shelf to open, so the sentence was false for the exact
  // cells it was pointing at.
  it("carries no header hint to contradict an inert cell", () => {
    expect(addPanelCopy.strip).not.toHaveProperty("hint");
    expect(JSON.stringify(addPanelCopy.strip)).not.toContain("Click a cell for rationale");
    expect(JSON.stringify(addPanelCopy.strip)).not.toContain("shelf below");
  });

  it("no longer carries the superseded shelf-link keys", () => {
    expect(addPanelCopy.strip).not.toHaveProperty("shelfLink");
    expect(addPanelCopy.strip).not.toHaveProperty("shelfLinkAria");
  });

  it("carries the arrow inside the caption, which is no longer a link", () => {
    expect(addPanelCopy.strip.cellLink).toBe("consider →");
  });

  it("names both figures in a short cell's accessible name, in two sentences", () => {
    expect(addPanelCopy.strip.cellLinkAria("Ramp", 4, 10)).toBe(
      "Ramp, 4 of 10. See ramp cards to consider.",
    );
  });

  it("names the figures without a call to action on a met cell", () => {
    expect(addPanelCopy.strip.cellStaticAria("Wipes", 3, 3)).toBe("Wipes, 3 of 3");
  });
});

describe("quickAdd.rowAria", () => {
  it("is byte-identical to the shipped 3-arg output when nothing is passed", () => {
    expect(
      addPanelCopy.quickAdd.rowAria("Swords to Plowshares", "Instant", true),
    ).toBe("Swords to Plowshares, Instant, owned");
  });

  it("ignores a null availability, so the free state stays silent", () => {
    expect(
      addPanelCopy.quickAdd.rowAria(
        "Swords to Plowshares",
        "Instant",
        true,
        null,
      ),
    ).toBe("Swords to Plowshares, Instant, owned");
  });

  it("appends the clause without displacing the type line", () => {
    expect(
      addPanelCopy.quickAdd.rowAria(
        "Cyclonic Rift",
        "Instant",
        true,
        "no free copies; this one is on your Atraxa list",
      ),
    ).toBe(
      "Cyclonic Rift, Instant, owned, no free copies; this one is on your Atraxa list",
    );
  });
});
