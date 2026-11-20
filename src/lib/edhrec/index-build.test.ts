import { describe, expect, it } from "vitest";
import { buildNameIndex, themeSlugsToFetch, toSupportRows, toThemeSupportRows } from "./index-build";
import type { EdhrecData } from "./parse";

const EMPTY_WIDE = {
  tags: [], bracketCounts: {}, budgetCounts: {}, similarNames: [],
  deckCount: null, rank: null, saltScore: null, composition: null, manaCurve: null,
};
const data = (over: Partial<EdhrecData>): EdhrecData => ({
  topCards: [], inclusionByName: {}, synergyByName: {}, ...EMPTY_WIDE, ...over,
});

const GISA = {
  oracleId: "11111111-1111-1111-1111-111111111111",
  name: "Ghoulcaller Gisa",
  oracleText:
    "{B}, {T}, Sacrifice another creature: Create X 2/2 black Zombie creature tokens, where X is the sacrificed creature's power.",
};

describe("buildNameIndex", () => {
  it("indexes the full lowercased name", () => {
    const idx = buildNameIndex([{ oracleId: "a", name: "Sol Ring" }]);
    expect(idx.get("sol ring")).toBe("a");
  });

  it("also indexes the front face of a double-faced card", () => {
    // EDHREC lists DFCs by front face while Scryfall names them "Front // Back".
    // Without the front-face key, every DFC in a support list is unresolvable.
    const idx = buildNameIndex([{ oracleId: "b", name: "Agadeem's Awakening // Agadeem, the Undercrypt" }]);
    expect(idx.get("agadeem's awakening")).toBe("b");
    expect(idx.get("agadeem's awakening // agadeem, the undercrypt")).toBe("b");
  });

  it("does not let a front-face key overwrite a real single-faced card", () => {
    // A single-faced card owns its own name; a DFC's derived front-face key must not win.
    const idx = buildNameIndex([
      { oracleId: "real", name: "Bala Ged Recovery" },
      { oracleId: "dfc", name: "Bala Ged Recovery // Bala Ged Sanctuary" },
    ]);
    expect(idx.get("bala ged recovery")).toBe("real");
  });

  it("reclaims the front-face key for the real card even when the DFC is indexed first", () => {
    // Order is reversed: DFC arrives in pass 1 and claims the front-face key;
    // pass 2's unconditional overwrite is the only thing that gives it back to the real card.
    const idx = buildNameIndex([
      { oracleId: "dfc", name: "Bala Ged Recovery // Bala Ged Sanctuary" },
      { oracleId: "real", name: "Bala Ged Recovery" },
    ]);
    expect(idx.get("bala ged recovery")).toBe("real");
    expect(idx.get("bala ged recovery // bala ged sanctuary")).toBe("dfc");
  });
});

describe("toSupportRows", () => {
  const nameIndex = buildNameIndex([
    { oracleId: "sol", name: "Sol Ring" },
    { oracleId: "gray", name: "Gray Merchant of Asphodel" },
    { oracleId: "ayara", name: "Ayara, First of Locthwain" },
  ]);

  it("builds an ok header with the classified engine and resolved similars", () => {
    const { header, cards, unresolved } = toSupportRows({
      commander: GISA,
      result: {
        data: data({
          topCards: ["Sol Ring", "Gray Merchant of Asphodel"],
          inclusionByName: { "sol ring": 71 },
          synergyByName: { "gray merchant of asphodel": 0.23 },
          tags: [{ slug: "zombies", label: "Zombies", count: 567 }],
          bracketCounts: { "2": 607 },
          similarNames: ["Ayara, First of Locthwain", "Never Printed"],
          deckCount: 4332, rank: 648, saltScore: 0.19, composition: null, manaCurve: null,
        }),
        unreachable: false,
      },
      nameIndex,
    });

    expect(header.synergyState).toBe("ok");
    expect(header.edhrecTotal).toBe(2);
    expect(header.engine).toBe("tap");
    expect(header.similarOracleIds).toEqual(["ayara"]);
    expect(header.deckCount).toBe(4332);
    expect(header.rank).toBe(648);
    expect(header.saltScore).toBe(0.19);
    expect(cards).toEqual([
      { commanderOracleId: GISA.oracleId, oracleId: "sol", inclusion: 71, synergy: null },
      { commanderOracleId: GISA.oracleId, oracleId: "gray", inclusion: null, synergy: 0.23 },
    ]);
    expect(unresolved).toBe(0);
  });

  it("counts an unresolvable support name without shrinking edhrecTotal", () => {
    // Dropping the name from the child table AND the denominator would inflate
    // measured overlap for every user. The row is dropped; the total is not.
    const { header, cards, unresolved } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: ["Sol Ring", "Never Printed"] }), unreachable: false },
      nameIndex,
    });
    expect(header.edhrecTotal).toBe(2);
    expect(cards).toHaveLength(1);
    expect(unresolved).toBe(1);
  });

  it("records absent with a null total when EDHREC does not index the commander", () => {
    const { header, cards } = toSupportRows({
      commander: GISA,
      result: { data: null, unreachable: false },
      nameIndex,
    });
    expect(header.synergyState).toBe("absent");
    expect(header.edhrecTotal).toBeNull();
    expect(cards).toEqual([]);
  });

  it("records degraded when EDHREC was unreachable", () => {
    // Distinct from absent: this one is worth retrying. Persisting them
    // identically is what the check constraints and synergy-state.ts prevent.
    const { header } = toSupportRows({
      commander: GISA,
      result: { data: null, unreachable: true },
      nameIndex,
    });
    expect(header.synergyState).toBe("degraded");
    expect(header.edhrecTotal).toBeNull();
  });

  it("treats an empty topCards list as absent, not ok", () => {
    // Matches synergyStateFrom: a parsed-but-empty payload is not data.
    const { header } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: [] }), unreachable: false },
      nameIndex,
    });
    expect(header.synergyState).toBe("absent");
  });

  it("resolves a support name by front face when the catalog holds the joined name", () => {
    const idx = buildNameIndex([{ oracleId: "bala", name: "Bala Ged Recovery // Bala Ged Sanctuary" }]);
    const { cards } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: ["Bala Ged Recovery"] }), unreachable: false },
      nameIndex: idx,
    });
    expect(cards[0].oracleId).toBe("bala");
  });

  it("never emits a support row for the commander itself", () => {
    const idx = buildNameIndex([{ oracleId: GISA.oracleId, name: GISA.name }, { oracleId: "sol", name: "Sol Ring" }]);
    const { cards } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: ["Ghoulcaller Gisa", "Sol Ring"] }), unreachable: false },
      nameIndex: idx,
    });
    expect(cards.map((c) => c.oracleId)).toEqual(["sol"]);
  });

  it("emits one row when a list names both faces of the same card", () => {
    // Both keys resolve to "bala". Two rows would share the composite primary
    // key and fail the insert for the whole commander, not just this row.
    const idx = buildNameIndex([{ oracleId: "bala", name: "Bala Ged Recovery // Bala Ged Sanctuary" }]);
    const { cards } = toSupportRows({
      commander: GISA,
      result: {
        data: data({ topCards: ["Bala Ged Recovery", "Bala Ged Recovery // Bala Ged Sanctuary"] }),
        unreachable: false,
      },
      nameIndex: idx,
    });
    expect(cards).toHaveLength(1);
  });
});

describe("themeSlugsToFetch", () => {
  const tag = (slug: string, count: number) => ({ slug, label: slug, count });

  it("takes the top three tags by deck count, each with at least 50 decks", () => {
    const tags = [tag("infect", 3545), tag("proliferate", 1505), tag("plus-1-plus-1-counters", 2165), tag("planeswalkers", 1789), tag("rare", 49)];
    expect(themeSlugsToFetch(tags).map((t) => t.slug)).toEqual(["infect", "plus-1-plus-1-counters", "planeswalkers"]);
  });

  it("has no percentage floor: a small share of a big commander still qualifies", () => {
    expect(themeSlugsToFetch([tag("planeswalkers", 1789)])).toHaveLength(1);
    expect(themeSlugsToFetch([tag("thin", 49), tag("edge", 50)]).map((t) => t.slug)).toEqual(["edge"]);
  });

  it("fetches a repeated slug once, never a slug outside EDHREC's shape, never a fractional count", () => {
    expect(themeSlugsToFetch([tag("zombies", 60), tag("zombies", 80)])).toEqual([tag("zombies", 80)]);
    expect(themeSlugsToFetch([tag("../other", 900), tag("a?b", 900), tag("Zombies", 900), tag("ok-slug", 60)]).map((t) => t.slug)).toEqual(["ok-slug"]);
    expect(themeSlugsToFetch([tag("half", 1505.5)])).toEqual([]);
  });

  it("keeps the tags' own order on a tie, and fetches nothing for no tags", () => {
    expect(themeSlugsToFetch([tag("a", 60), tag("top", 90), tag("b", 60)]).map((t) => t.slug)).toEqual(["top", "a", "b"]);
    expect(themeSlugsToFetch([])).toEqual([]);
  });
});

describe("toThemeSupportRows", () => {
  const nameIndex = buildNameIndex([
    { oracleId: "sol", name: "Sol Ring" },
    { oracleId: "gisa", name: GISA.name },
  ]);
  const theme = { slug: "zombies", label: "Zombies", count: 567 };

  it("stores the theme's deck count and its cards, the commander and unresolvable names left out", () => {
    const rows = toThemeSupportRows({
      commander: GISA, theme, nameIndex,
      result: { data: data({ topCards: ["Sol Ring", GISA.name, "Never Printed"], inclusionByName: { "sol ring": 80 }, synergyByName: { "sol ring": 0.1 } }), unreachable: false },
    });
    expect(rows?.header).toEqual({ commanderOracleId: GISA.oracleId, slug: "zombies", deckCount: 567 });
    expect(rows?.cards).toEqual([{ commanderOracleId: GISA.oracleId, slug: "zombies", oracleId: "sol", inclusion: 80, synergy: 0.1 }]);
    expect(rows?.unresolved).toBe(1);
  });

  it("stores nothing for a page that is not a clean read", () => {
    expect(toThemeSupportRows({ commander: GISA, theme, nameIndex, result: { data: null, unreachable: false } })).toBeNull();
    expect(toThemeSupportRows({ commander: GISA, theme, nameIndex, result: { data: null, unreachable: true } })).toBeNull();
    // A payload of an unexpected shape parses to an empty list: that is no theme page either.
    expect(toThemeSupportRows({ commander: GISA, theme, nameIndex, result: { data: data({ topCards: [] }), unreachable: false } })).toBeNull();
    // Nor is one whose names all fail to resolve, or name only the commander.
    expect(toThemeSupportRows({ commander: GISA, theme, nameIndex, result: { data: data({ topCards: ["Never Printed", GISA.name] }), unreachable: false } })).toBeNull();
  });

  it("stores nothing for a theme the fetch rule would not choose", () => {
    const ok = { data: data({ topCards: ["Sol Ring"] }), unreachable: false };
    expect(toThemeSupportRows({ commander: GISA, theme: { ...theme, count: 0 }, nameIndex, result: ok })).toBeNull();
    expect(toThemeSupportRows({ commander: GISA, theme: { ...theme, slug: "../x" }, nameIndex, result: ok })).toBeNull();
  });
});
