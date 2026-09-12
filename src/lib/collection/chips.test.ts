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
    expect(chip.label).toBe("2 colours");
    expect(chip.dots).toHaveLength(2);
  });

  it("hands back the filters with only that control unset", () => {
    const filters = { ...EMPTY, search: "bolt", colors: ["R"] };
    const search = collectionChips(filters, options).find((c) => c.key === "q")!;
    expect(search.next).toMatchObject({ search: "", colors: ["R"] });
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
