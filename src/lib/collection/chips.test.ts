import { describe, expect, it } from "vitest";
import { collectionChips } from "./chips";
import type { BrowseFilters } from "./browse";

const EMPTY: BrowseFilters = { search: "", colors: [], types: [], setCodes: [] };
const options = {
  types: [{ code: "Creature", label: "Creature" }],
  sets: [{ code: "EOE", label: "Edge of Eternities" }],
  availability: [{ code: "free", label: "Free" }],
};

describe("collectionChips", () => {
  it("gives an untouched bar no chips", () => {
    expect(collectionChips(EMPTY, options)).toHaveLength(0);
  });

  it("orders chips by control, search first", () => {
    const chips = collectionChips(
      { ...EMPTY, search: "bolt", colors: ["R"], types: ["Creature"] },
      options,
    );
    expect(chips.map((c) => c.key)).toEqual(["q", "colors", "types"]);
  });

  it("names a single value and counts several", () => {
    expect(collectionChips({ ...EMPTY, setCodes: ["EOE"] }, options)[0].label)
      .toBe("Edge of Eternities");
    expect(collectionChips({ ...EMPTY, setCodes: ["EOE", "DSK"] }, options)[0].label)
      .toBe("2 sets");
  });

  it("carries a swatch per lit hue, since the label collapses them", () => {
    const chip = collectionChips({ ...EMPTY, colors: ["W", "B"] }, options)[0];
    expect(chip.label).toBe("2 colors");
    expect(chip.dots).toHaveLength(2);
  });

  it("names every collapsed value, not just colours", () => {
    // Types, sets and availability all collapse to a count too, and the row
    // this replaces named each one.
    const opts = {
      types: [
        { code: "Creature", label: "Creature" },
        { code: "Land", label: "Land" },
      ],
      sets: [
        { code: "EOE", label: "Edge of Eternities" },
        { code: "DSK", label: "Duskmourn" },
      ],
      availability: [
        { code: "free", label: "Free" },
        { code: "spoken", label: "Spoken for" },
      ],
    };
    expect(collectionChips({ ...EMPTY, types: ["Creature", "Land"] }, opts)[0].spoken)
      .toBe("Creature, Land");
    expect(collectionChips({ ...EMPTY, setCodes: ["EOE", "DSK"] }, opts)[0].spoken)
      .toBe("Edge of Eternities, Duskmourn");
  });

  it("leaves a single set or type unspoken, since the label already names it", () => {
    const chip = collectionChips({ ...EMPTY, setCodes: ["EOE"] }, options)[0];
    expect(chip.label).toBe("Edge of Eternities");
    expect(chip.spoken).toBeUndefined();
  });

  it("names a single colour, because its label is a count and not a name", () => {
    // "1 colour" with an aria-hidden swatch leaves a screen reader unable to
    // say which hue — unlike a set, which renders as its own name.
    const chip = collectionChips({ ...EMPTY, colors: ["G"] }, options)[0];
    expect(chip.label).toBe("1 color");
    expect(chip.spoken).toBe("Green");
  });

  it("names the colours for a reader who cannot see the swatches", () => {
    // The dots are aria-hidden, so "2 colours" is all a screen reader would get
    // — the row this replaces named each one.
    const chip = collectionChips({ ...EMPTY, colors: ["W", "B"] }, options)[0];
    expect(chip.spoken).toBe("White, Black");
  });

  it("hands back the filters with only that control unset", () => {
    const filters = { ...EMPTY, search: "bolt", colors: ["R"] };
    const search = collectionChips(filters, options).find((c) => c.key === "q")!;
    expect(search.next).toMatchObject({ search: "", colors: ["R"] });
  });

  it("carries the availability states so the chip can draw the rows' marker", () => {
    // The retired chip row drew an AvailabilityGlyph per state; a chip naming a state
    // without its marker would be the one place that pairing breaks.
    const chip = collectionChips(
      { ...EMPTY, availability: ["soft", "hard"] as never },
      { ...options, availability: [
        { code: "soft", label: "Spoken for" },
        { code: "hard", label: "Committed" },
      ] },
    )[0];
    expect(chip.markers).toEqual(["soft", "hard"]);
  });

  it("leaves free markerless, as the rows do", () => {
    const chip = collectionChips(
      { ...EMPTY, availability: ["free", "soft"] as never },
      { ...options, availability: [
        { code: "free", label: "Free" },
        { code: "soft", label: "Spoken for" },
      ] },
    )[0];
    expect(chip.markers).toEqual(["soft"]);
  });

  it("treats absent and empty availability the same", () => {
    expect(collectionChips({ ...EMPTY, availability: [] }, options)).toHaveLength(0);
    expect(collectionChips(EMPTY, options)).toHaveLength(0);
  });

  it("falls back to the code when an option has no label yet", () => {
    // Set options are filter-aware, so a code can be selected while its option
    // is not in the current list. A bare code beats an empty chip.
    const chip = collectionChips({ ...EMPTY, setCodes: ["ZZZ"] }, options)[0];
    expect(chip.label).toBe("ZZZ");
  });
});

describe("collectionChassisCopy.result", () => {
  // Moved to the three-figure signature 3b introduces: /collection counts
  // distinct names and copies separately, and the result line has to say which
  // is which. The two-figure cases these replace asserted a shape that only
  // existed between 3a and this change.
  it("states both figures at rest, because they count different things", async () => {
    const { collectionChassisCopy } = await import("../copy/collection");
    expect(collectionChassisCopy.result(1240, 1240, 2933, false)).toBe(
      "Showing 1,240 unique · 2,933 total",
    );
  });

  it("states the survivors against the distinct total once filtered", async () => {
    const { collectionChassisCopy } = await import("../copy/collection");
    // Distinct against distinct. 2,933 is a count of COPIES, and "412 of 2,933"
    // invited the reader to do arithmetic between two different units.
    expect(collectionChassisCopy.result(412, 1240, 2933, true)).toBe("Showing 412 of 1,240");
  });

  it("keeps the phone's shorter line", async () => {
    const { collectionChassisCopy } = await import("../copy/collection");
    // Row 3 also carries `By set` and the view toggle at 390px.
    expect(collectionChassisCopy.resultCompact(1240)).toBe("1,240 results");
  });

  it("pins the locale, so a European reader does not get 1.240", async () => {
    const { collectionChassisCopy } = await import("../copy/collection");
    const line = collectionChassisCopy.result(1000, 1000, 2000, false);
    expect(line).toContain("1,000");
    expect(line).not.toContain("1.000");
  });
});

describe("collectionChassisCopy.announceClearedAll", () => {
  it("names the clear as every filter, not one dimension", async () => {
    const { collectionChassisCopy } = await import("../copy/collection");
    // The per-dimension announcements are tried in order, so reusing a
    // dimension's intent for the chassis's Clear had a colour clear announce
    // "Set filter cleared."
    expect(collectionChassisCopy.announceClearedAll(2933)).toBe(
      "Filters cleared. 2,933 cards shown.",
    );
  });
});
