import { describe, expect, it } from "vitest";
import { addPanelCopy, decksBuilderCopy, shortCommanderName } from "./decks-builder";

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
    expect(addPanelCopy.announce.added("Sol Ring", 12, "Ramp", 4, 10)).toBe(
      "Sol Ring added · 12 of 99 · Ramp 4 of 10",
    );
    expect(addPanelCopy.announce.addedNoRole("Sol Ring", 12)).toBe("Sol Ring added · 12 of 99");
  });
});

describe("decksBuilderCopy", () => {
  it("reproduces the mock's completion caption verbatim", () => {
    expect(decksBuilderCopy.completion.caption("Korvold")).toBe(
      "Korvold is fed — 99 of 99, all owned. Try not to let it get to your head at the table.",
    );
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
// addPanelCopy: decksBuilderCopy's untouched strings keep theirs.
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
      return argLists.flatMap((args) => {
        try {
          return [String((value as (...a: unknown[]) => string)(...args))];
        } catch {
          // A fill of the wrong shape for this member. It samples nothing rather
          // than failing the invariant on a call the app never makes; the other
          // shapes still render every literal frame in the member.
          return [];
        }
      });
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

// The addendum's one genuine shipping hazard: `strip.hint` was replaced at the
// same key, so a merge of the two objects would have left two live values and
// the strip would have kept telling players to click a cell for rationale.
describe("addPanelCopy.strip after #184", () => {
  it("ships exactly one live hint, at the new value", () => {
    expect(addPanelCopy.strip.hint).toBe("A cell under target opens its shelf below");
    expect(JSON.stringify(addPanelCopy.strip)).not.toContain("Click a cell for rationale");
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
