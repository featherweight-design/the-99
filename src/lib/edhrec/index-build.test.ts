import { describe, expect, it } from "vitest";
import { buildNameIndex, toSupportRows } from "./index-build";
import type { EdhrecData } from "./parse";

const EMPTY_WIDE = {
  tags: [], bracketCounts: {}, budgetCounts: {}, similarNames: [],
  deckCount: null, rank: null, saltScore: null,
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
          deckCount: 4332, rank: 648, saltScore: 0.19,
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
