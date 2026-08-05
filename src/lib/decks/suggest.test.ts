import { describe, expect, it } from "vitest";
import { suggestDeck, humanRole, buildSuggestionPayload } from "./suggest";
import type { PoolCard } from "../recs/score";
import type { DeckSuggestion, Suggestion } from "./suggest";

let n = 0;
const card = (over: Partial<PoolCard>): PoolCard => ({
  oracleId: `o-${n++}`, name: `Card ${n}`, typeLine: "Creature",
  oracleText: "", keywords: [], colorIdentity: [], imageUri: null, manaCost: null, ...over,
});
const commander = card({ name: "Cmdr", typeLine: "Legendary Creature", colorIdentity: ["G"] });

describe("suggestDeck", () => {
  it("prioritizes owned EDHREC top cards, tagging them 'edhrec'", () => {
    const solRing = card({ name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." });
    const filler = card({ name: "Grizzly Bears" });
    const out = suggestDeck({ commander, ownedPool: [solRing, filler], edhrecTopCards: ["Sol Ring"] });
    expect(out[0]).toEqual({ oracleId: solRing.oracleId, reason: "edhrec" });
  });

  it("fills roles up to targets from the remaining pool", () => {
    const ramps = Array.from({ length: 15 }, () =>
      card({ typeLine: "Artifact", oracleText: "{T}: Add {C}." }));
    const out = suggestDeck({ commander, ownedPool: ramps, edhrecTopCards: null });
    expect(out.filter((s) => s.reason === "ramp")).toHaveLength(10); // capped at target
  });

  it("includes lands tagged 'land'", () => {
    const forest = card({ name: "Forest", typeLine: "Basic Land — Forest" });
    const out = suggestDeck({ commander, ownedPool: [forest], edhrecTopCards: null });
    expect(out).toContainEqual({ oracleId: forest.oracleId, reason: "land" });
  });

  it("never suggests more than 99 cards and never duplicates an oracleId", () => {
    const pool = Array.from({ length: 150 }, () => card({ typeLine: "Basic Land — Forest" }));
    const out = suggestDeck({ commander, ownedPool: pool, edhrecTopCards: null });
    expect(out.length).toBeLessThanOrEqual(99);
    expect(new Set(out.map((s) => s.oracleId)).size).toBe(out.length);
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
  } satisfies Suggestion &
    Pick<DeckSuggestion, "name" | "typeLine" | "cardTypeGroup" | "role" | "imageUri">;

  it("owned edhrec suggestion with inclusion → EDHREC · N% of decks", () => {
    const result = buildSuggestionPayload({ ...base, owned: true }, { "sol ring": 71 });
    expect(result.reasonType).toBe("edhrec");
    expect(result.reasonLabel).toBe("EDHREC · 71% of decks");
    expect(result.owned).toBe(true);
    expect(result.inDeck).toBe(false);
  });

  it("owned edhrec suggestion with no inclusion → EDHREC staple", () => {
    const result = buildSuggestionPayload({ ...base, owned: true }, {});
    expect(result.reasonLabel).toBe("EDHREC staple");
  });

  it("resolves inclusion label for mixed-case card name against lowercase keys", () => {
    // Simulates the real scenario: parse.ts stores lowercase keys ("sol ring"),
    // suggest.ts looks up s.name.toLowerCase() — these must match.
    const mixedCaseSuggestion = { ...base, oracleId: "abc", name: "Sol Ring", reason: "edhrec" } as const;
    const inclusionByName = { "sol ring": 84.2 }; // stored by parse.ts in lowercase
    const result = buildSuggestionPayload({ ...mixedCaseSuggestion, owned: true }, inclusionByName);
    expect(result.reasonLabel).toBe("EDHREC · 84.2% of decks");
  });

  it("falls back to front-face name for DFC inclusion lookup", () => {
    // Scryfall names DFCs "Front // Back"; EDHREC keys inclusion by front face.
    const dfc = {
      ...base,
      oracleId: "dfc1", name: "Valki, God of Lies // Tibalt, Cosmic Impostor", reason: "edhrec",
    } as const;
    const result = buildSuggestionPayload({ ...dfc, owned: true }, { "valki, god of lies": 12 });
    expect(result.reasonLabel).toBe("EDHREC · 12% of decks");
  });

  it("role-fill suggestion → Fills ramp · rec 10", () => {
    const rampSuggestion = { ...base, oracleId: "xyz", name: "Rampant Growth", reason: "ramp" } as const;
    const result = buildSuggestionPayload({ ...rampSuggestion, owned: true }, {});
    expect(result.reasonType).toBe("role");
    expect(result.reasonLabel).toBe("Fills ramp · rec 10");
  });

  it("carries inclusionPct as a number alongside the unchanged label", () => {
    const result = buildSuggestionPayload({ ...base, owned: true }, { "sol ring": 71 });
    expect(result.inclusionPct).toBe(71);
    expect(result.reasonLabel).toBe("EDHREC · 71% of decks");
  });

  it("edhrec suggestion with no inclusion entry → inclusionPct null", () => {
    // The drawn `no EDHREC figure` state: absent, never a 0% bar.
    const result = buildSuggestionPayload({ ...base, owned: true }, {});
    expect(result.inclusionPct).toBeNull();
  });

  it("role-sourced suggestion → inclusionPct null", () => {
    const rampSuggestion = { ...base, oracleId: "xyz", name: "Rampant Growth", reason: "ramp" } as const;
    const result = buildSuggestionPayload({ ...rampSuggestion, owned: true }, { "rampant growth": 40 });
    expect(result.inclusionPct).toBeNull();
  });

  it("resolves inclusionPct through the DFC front-face fallback", () => {
    const dfc = {
      ...base,
      oracleId: "dfc1", name: "Valki, God of Lies // Tibalt, Cosmic Impostor", reason: "edhrec",
    } as const;
    const result = buildSuggestionPayload({ ...dfc, owned: true }, { "valki, god of lies": 12 });
    expect(result.inclusionPct).toBe(12);
  });

  it("passes imageUri through, including null (the `no art on file` state)", () => {
    expect(buildSuggestionPayload({ ...base, owned: true }, {}).imageUri)
      .toBe("https://cards.example/sol-ring.jpg");
    expect(buildSuggestionPayload({ ...base, imageUri: null, owned: true }, {}).imageUri)
      .toBeNull();
  });

  describe("lift", () => {
    // Decision 6: surface lift only where positive. A zero or negative figure is
    // not a selling point, and drawing one is worse than the drawn omission.
    it("carries a positive synergy as lift", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, { "sol ring": 0.23 }).lift)
        .toBe(0.23);
    });

    it("resolves zero synergy to null", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, { "sol ring": 0 }).lift)
        .toBeNull();
    });

    it("resolves negative synergy to null", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, { "sol ring": -0.4 }).lift)
        .toBeNull();
    });

    it("resolves absent synergy to null", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}, {}).lift).toBeNull();
    });

    it("defaults lift to null when no synergy map is supplied at all", () => {
      expect(buildSuggestionPayload({ ...base, owned: true }, {}).lift).toBeNull();
    });

    it("resolves lift through the DFC front-face fallback", () => {
      const dfc = {
        ...base,
        oracleId: "dfc1", name: "Valki, God of Lies // Tibalt, Cosmic Impostor", reason: "edhrec",
      } as const;
      expect(
        buildSuggestionPayload({ ...dfc, owned: true }, {}, { "valki, god of lies": 0.5 }).lift,
      ).toBe(0.5);
    });
  });
});
