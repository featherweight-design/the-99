import { describe, expect, it } from "vitest";
import { suggestDeck, humanRole, buildSuggestionPayload } from "./suggest";
import type { PoolCard } from "../recs/score";
import type { Suggestion } from "./suggest";

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
  const base: Suggestion & { name: string } = {
    oracleId: "abc", name: "Sol Ring", reason: "edhrec",
  };

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

  it("role-fill suggestion → Fills ramp · rec 10", () => {
    const rampSuggestion: Suggestion & { name: string } = { oracleId: "xyz", name: "Rampant Growth", reason: "ramp" };
    const result = buildSuggestionPayload({ ...rampSuggestion, owned: true }, {});
    expect(result.reasonType).toBe("role");
    expect(result.reasonLabel).toBe("Fills ramp · rec 10");
  });
});
