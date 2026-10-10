import { describe, expect, it } from "vitest";
import { suggestDeck, humanRole, buildSuggestionPayload, rolesForSuggestion } from "./suggest";
import type { PoolCard } from "../recs/score";
import type { DeckSuggestion, Suggestion } from "./suggest";

import { recommendedMix } from "./mix";

/** The asserted baseline, which is what every case here was written against. */
const TEST_MIX = recommendedMix(null, false);

// Test helpers for synergyFigure tests. edhrecCandidate and roleCandidate build
// the payload shape buildSuggestionPayload requires; buildSuggestions maps over
// an array of them so a test can assert on a specific index.
function edhrecCandidate(name: string): Suggestion &
  Pick<DeckSuggestion, "name" | "typeLine" | "cardTypeGroup" | "role" | "imageUri" | "manaCost" | "manaValue"> & { owned: boolean } {
  return {
    oracleId: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    reason: "edhrec",
    typeLine: "Instant",
    cardTypeGroup: "Instants",
    role: "other",
    imageUri: null,
    manaCost: "{U}",
    manaValue: 1,
    owned: true,
  };
}

function roleCandidate(name: string, reason: "ramp" | "draw" | "removal" | "wipes" | "land"): Suggestion &
  Pick<DeckSuggestion, "name" | "typeLine" | "cardTypeGroup" | "role" | "imageUri" | "manaCost" | "manaValue"> & { owned: boolean } {
  return {
    oracleId: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    reason,
    typeLine: "Sorcery",
    cardTypeGroup: "Instants",
    role: "ramp",
    imageUri: null,
    manaCost: "{1}{G}",
    manaValue: 2,
    owned: true,
  };
}

function buildSuggestions(
  candidates: ReturnType<typeof edhrecCandidate>[],
  inclusionByName: Record<string, number | undefined>,
  synergyByName: Record<string, number | undefined>,
): DeckSuggestion[] {
  return candidates.map((c) => buildSuggestionPayload(c, inclusionByName, synergyByName, TEST_MIX));
}

let n = 0;
const card = (over: Partial<PoolCard>): PoolCard => ({
  oracleId: `o-${n++}`, name: `Card ${n}`, typeLine: "Creature",
  oracleText: "", keywords: [], colorIdentity: [], imageUri: null, artCropUri: null,
  manaCost: null, ...over,
});
const commander = card({ name: "Cmdr", typeLine: "Legendary Creature", colorIdentity: ["G"] });

describe("suggestDeck", () => {
  it("prioritizes owned EDHREC top cards, tagging them 'edhrec'", () => {
    const solRing = card({ name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." });
    const filler = card({ name: "Grizzly Bears" });
    const out = suggestDeck({ commander, ownedPool: [solRing, filler], edhrecTopCards: ["Sol Ring"], hasPartner: false, mix: TEST_MIX });
    expect(out[0]).toEqual({ oracleId: solRing.oracleId, reason: "edhrec" });
  });

  it("fills roles up to targets from the remaining pool", () => {
    const ramps = Array.from({ length: 15 }, () =>
      card({ typeLine: "Artifact", oracleText: "{T}: Add {C}." }));
    const out = suggestDeck({ commander, ownedPool: ramps, edhrecTopCards: null, hasPartner: false, mix: TEST_MIX });
    expect(out.filter((s) => s.reason === "ramp")).toHaveLength(10); // capped at target
  });

  it("includes lands tagged 'land'", () => {
    const forest = card({ name: "Forest", typeLine: "Basic Land — Forest" });
    const out = suggestDeck({ commander, ownedPool: [forest], edhrecTopCards: null, hasPartner: false, mix: TEST_MIX });
    expect(out).toContainEqual({ oracleId: forest.oracleId, reason: "land" });
  });

  it("never suggests more than 99 cards and never duplicates an oracleId", () => {
    const pool = Array.from({ length: 150 }, () => card({ typeLine: "Basic Land — Forest" }));
    const out = suggestDeck({ commander, ownedPool: pool, edhrecTopCards: null, hasPartner: false, mix: TEST_MIX });
    expect(out.length).toBeLessThanOrEqual(99);
    expect(new Set(out.map((s) => s.oracleId)).size).toBe(out.length);
  });

  it("plans a pair to 98 cards", () => {
    const pool = Array.from({ length: 150 }, () => card({ typeLine: "Basic Land — Forest" }));
    const out = suggestDeck({ commander, ownedPool: pool, edhrecTopCards: null, hasPartner: true, mix: TEST_MIX });
    expect(out.length).toBeLessThanOrEqual(98);
  });

  describe("by label", () => {
    it("counts a land only as a land on the label basis, even when its text also reads draw", () => {
      const canopy = card({ name: "Canopy", typeLine: "Land", oracleText: "{1}, {T}, Sacrifice Canopy: Draw a card." });
      expect(rolesForSuggestion(canopy, undefined)).toEqual(["land", "draw"]);
      expect(rolesForSuggestion(canopy, new Map())).toEqual(["land"]);
    });

    const base = { commander, edhrecTopCards: null, hasPartner: false, mix: TEST_MIX } as const;
    const rocks = Array.from({ length: 12 }, () => card({ typeLine: "Artifact", oracleText: "{T}: Add {C}." }));

    it("fills a role from the cards whose LABEL names it, not the ones whose text does", () => {
      // By text every rock is ramp. By label two are ramp and the rest draw.
      const roleSets = new Map(rocks.map((r, i) => [r.oracleId, [i < 2 ? "ramp" : "draw"] as ("ramp" | "draw")[]]));
      const out = suggestDeck({ ...base, ownedPool: rocks, roleSets });
      expect(out.filter((s) => s.reason === "ramp").map((s) => s.oracleId)).toEqual([rocks[0].oracleId, rocks[1].oracleId]);
      expect(out.filter((s) => s.reason === "draw")).toHaveLength(10); // the draw target
    });

    it("never suggests a card with no fresh label for a role", () => {
      const out = suggestDeck({ ...base, ownedPool: rocks, roleSets: new Map() });
      expect(out.filter((s) => s.reason !== "land")).toEqual([]);
    });

    it("leaves a land to the classifier, whatever the label map holds", () => {
      const forest = card({ name: "Forest", typeLine: "Basic Land — Forest" });
      const out = suggestDeck({ ...base, ownedPool: [forest], roleSets: new Map([[forest.oracleId, ["ramp"]]]) });
      expect(out).toContainEqual({ oracleId: forest.oracleId, reason: "land" });
    });
  });
});

describe("humanRole", () => {
  it("maps role tokens to display strings", () => {
    expect(humanRole("ramp")).toBe("ramp");
    expect(humanRole("draw")).toBe("draw");
    expect(humanRole("removal")).toBe("removal");
    expect(humanRole("wipes")).toBe("wipes");
    expect(humanRole("land")).toBe("lands");
  });
});

describe("buildSuggestionPayload", () => {
  const base = {
    oracleId: "abc", name: "Sol Ring", reason: "edhrec",
    typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp",
    imageUri: "https://cards.example/sol-ring.jpg",
    manaCost: "{1}", manaValue: 1,
  } satisfies Suggestion &
    Pick<
      DeckSuggestion,
      "name" | "typeLine" | "cardTypeGroup" | "role" | "imageUri" | "manaCost" | "manaValue"
    >;

  it("owned edhrec suggestion with inclusion → EDHREC · N% of decks", () => {
    const result = buildSuggestionPayload({ ...base, owned: true }, { "sol ring": 71 }, {}, TEST_MIX);
    expect(result.reasonType).toBe("edhrec");
    expect(result.reasonLabel).toBe("EDHREC · 71% of decks");
    expect(result.owned).toBe(true);
    expect(result.inDeck).toBe(false);
  });

  it("owned edhrec suggestion with no inclusion → EDHREC staple", () => {
    const result = buildSuggestionPayload({ ...base, owned: true }, {}, {}, TEST_MIX);
    expect(result.reasonLabel).toBe("EDHREC staple");
  });

  it("resolves inclusion label for mixed-case card name against lowercase keys", () => {
    // Simulates the real scenario: parse.ts stores lowercase keys ("sol ring"),
    // suggest.ts looks up s.name.toLowerCase() — these must match.
    const mixedCaseSuggestion = { ...base, oracleId: "abc", name: "Sol Ring", reason: "edhrec" } as const;
    const inclusionByName = { "sol ring": 84.2 }; // stored by parse.ts in lowercase
    const result = buildSuggestionPayload({ ...mixedCaseSuggestion, owned: true }, inclusionByName, {}, TEST_MIX);
    expect(result.reasonLabel).toBe("EDHREC · 84.2% of decks");
  });

  it("falls back to front-face name for DFC inclusion lookup", () => {
    // Scryfall names DFCs "Front // Back"; EDHREC keys inclusion by front face.
    const dfc = {
      ...base,
      oracleId: "dfc1", name: "Valki, God of Lies // Tibalt, Cosmic Impostor", reason: "edhrec",
    } as const;
    const result = buildSuggestionPayload({ ...dfc, owned: true }, { "valki, god of lies": 12 }, {}, TEST_MIX);
    expect(result.reasonLabel).toBe("EDHREC · 12% of decks");
  });

  it("role-fill suggestion → Fills ramp · rec 10", () => {
    const rampSuggestion = { ...base, oracleId: "xyz", name: "Rampant Growth", reason: "ramp" } as const;
    const result = buildSuggestionPayload({ ...rampSuggestion, owned: true }, {}, {}, TEST_MIX);
    expect(result.reasonType).toBe("role");
    expect(result.reasonLabel).toBe("Fills ramp · rec 10");
  });

  it("carries inclusionPct as a number alongside the unchanged label", () => {
    const result = buildSuggestionPayload({ ...base, owned: true }, { "sol ring": 71 }, {}, TEST_MIX);
    expect(result.inclusionPct).toBe(71);
    expect(result.reasonLabel).toBe("EDHREC · 71% of decks");
  });

  it("edhrec suggestion with no inclusion entry → inclusionPct null", () => {
    // The drawn `no EDHREC figure` state: absent, never a 0% bar.
    const result = buildSuggestionPayload({ ...base, owned: true }, {}, {}, TEST_MIX);
    expect(result.inclusionPct).toBeNull();
  });

  it("role-sourced suggestion → inclusionPct null", () => {
    const rampSuggestion = { ...base, oracleId: "xyz", name: "Rampant Growth", reason: "ramp" } as const;
    const result = buildSuggestionPayload({ ...rampSuggestion, owned: true }, { "rampant growth": 40 }, {}, TEST_MIX);
    expect(result.inclusionPct).toBeNull();
  });

  it("resolves inclusionPct through the DFC front-face fallback", () => {
    const dfc = {
      ...base,
      oracleId: "dfc1", name: "Valki, God of Lies // Tibalt, Cosmic Impostor", reason: "edhrec",
    } as const;
    const result = buildSuggestionPayload({ ...dfc, owned: true }, { "valki, god of lies": 12 }, {}, TEST_MIX);
    expect(result.inclusionPct).toBe(12);
  });

  it.each([NaN, Infinity])(
    "treats a non-finite inclusion of %p as absent, in both the figure and the label",
    (pct) => {
      const result = buildSuggestionPayload({ ...base, owned: true }, { "sol ring": pct }, {}, TEST_MIX);
      expect(result.inclusionPct).toBeNull();
      expect(result.reasonLabel).toBe("EDHREC staple");
    },
  );

  it("passes imageUri through, including null (the `no art on file` state)", () => {
    expect(buildSuggestionPayload({ ...base, owned: true }, {}, {}, TEST_MIX).imageUri)
      .toBe("https://cards.example/sol-ring.jpg");
    expect(buildSuggestionPayload({ ...base, imageUri: null, owned: true }, {}, {}, TEST_MIX).imageUri)
      .toBeNull();
  });

  describe("lift", () => {
    // Decision 6: surface lift only where positive. A zero or negative figure is
    // not a selling point, and drawing one is worse than the drawn omission.
    it("carries a positive synergy as lift", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, { "sol ring": 0.23 }, TEST_MIX).lift)
        .toBe(0.23);
    });

    it("resolves zero synergy to null", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, { "sol ring": 0 }, TEST_MIX).lift)
        .toBeNull();
    });

    it("resolves negative synergy to null", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, { "sol ring": -0.4 }, TEST_MIX).lift)
        .toBeNull();
    });

    it("resolves absent synergy to null", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, {}, TEST_MIX).lift).toBeNull();
    });

    it("defaults lift to null when no synergy map is supplied at all", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, {}, TEST_MIX).lift).toBeNull();
    });

    // The map is a parameter, so this function is its own boundary — parse.ts
    // filtering upstream does not bind a caller who builds a map another way.
    it.each([NaN, Infinity, -Infinity])("resolves a non-finite synergy of %p to null", (synergy) => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, { "sol ring": synergy }, TEST_MIX).lift)
        .toBeNull();
    });

    it("resolves lift through the DFC front-face fallback", () => {
      const dfc = {
        ...base,
        oracleId: "dfc1", name: "Valki, God of Lies // Tibalt, Cosmic Impostor", reason: "edhrec",
      } as const;
      expect(
        buildSuggestionPayload({ ...dfc, owned: true }, {}, { "valki, god of lies": 0.5 }, TEST_MIX).lift,
      ).toBe(0.5);
    });

    it("carries a negative synergy figure that lift refuses", () => {
      const [s] = buildSuggestions([edhrecCandidate("Ponder")], {}, { ponder: -0.03 });
      expect(s.lift).toBeNull();
      expect(s.synergyFigure).toBeCloseTo(-0.03);
    });

    it("leaves synergyFigure null on a role suggestion", () => {
      const [s] = buildSuggestions([roleCandidate("Llanowar Elves", "ramp")], {}, {});
      expect(s.synergyFigure).toBeNull();
    });
  });
});

// TASK 18. The shelf header counts against the resolved target and the tile quotes one; before
// this they read two different sources, so any commander whose measured ramp was not ten got a
// header of `have / 12` beside tiles reading `rec 10`.
describe("the tile quotes the resolved target", () => {
  // Its own card, because `base` is scoped to another describe.
  const card = {
    oracleId: "abc", name: "Sol Ring", reason: "ramp" as const,
    typeLine: "Artifact", cardTypeGroup: "Artifacts" as const, role: "ramp" as const,
    imageUri: null, manaCost: "{1}", manaValue: 1, owned: true,
  };
  const measured = recommendedMix({
    composition: {
      of: "commander",
      targets: { land: 34, basic: 18, nonbasic: 16, creature: 30, instant: 7,
        sorcery: 6, artifact: 5, enchantment: 4, planeswalker: 1, battle: 0 },
      averageCurve: null,
    },
    roleTargets: { of: "commander", targets: { ramp: 12, draw: 11, removal: 7, wipes: 2 } },
    condition: "G", thinCondition: false, staples: [], commanderDeckCount: 1000,
  }, false);

  it("says the measured figure, not the asserted one", () => {
    const tile = buildSuggestionPayload(
      card, {}, {}, measured,
    );
    expect(tile.reasonLabel).toContain("rec 12");
    expect(tile.reasonLabel).not.toContain("rec 10");
  });

  it("and the land tile takes the measured land count", () => {
    const tile = buildSuggestionPayload(
      { ...card, reason: "land" as const, role: "land" as const }, {}, {}, measured,
    );
    expect(tile.reasonLabel).toContain("rec 34");
  });
});
