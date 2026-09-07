import { describe, expect, it, vi } from "vitest";

// Mock db and edhrec before importing recommend to avoid DATABASE_URL at module init.
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../edhrec/client", () => ({
  getEdhrecData: vi.fn(),
  readEdhrecCache: vi.fn(async () => new Map()),
  resolveEdhrecData: vi.fn(async () => ({ data: null, unreachable: false })),
}));

import { byScoreThenOracleId, finalizeRecommendations, toListItem } from "./recommend";
import type { CommanderScore } from "./score";
import type { SynergyState } from "./synergy-state";

// Minimal CommanderScore stub for testing post-processing only.
function stubScore(name: string, score = 0): CommanderScore & { synergyState: SynergyState } {
  return {
    oracleId: `oracle-${name}`,
    name,
    colorIdentity: [],
    imageUri: null,
    typeLine: "Legendary Creature",
    oracleText: null,
    manaCost: null,
    colorPoolSize: 0,
    edhrecOwnedCount: null,
    edhrecTotal: null,
    roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
    roleGaps: [],
    roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
    overlapOwned: [], overlapOwnedIds: [],
    fitPool: 0,
    fitRoles: 0,
    fitSynergy: null,
    score,
    measurableTotal: 40,
    rankScore: Math.round((100 * score) / 40),
    synergyState: "ok",
  };
}

describe("byScoreThenOracleId", () => {
  it("orders by descending rank score", () => {
    const sorted = [{ rankScore: 5, oracleId: "a" }, { rankScore: 9, oracleId: "b" }].sort(byScoreThenOracleId);
    expect(sorted.map((r) => r.oracleId)).toEqual(["b", "a"]);
  });

  // The printed score and the ordering key part company for a commander EDHREC
  // does not index. 32 of 40 is the better fit and must outrank 41 of 100, which
  // sorting on the printed figure got backwards.
  it("ranks a no-synergy commander on its own scale, not its printed score", () => {
    const rows = [
      { rankScore: 41, oracleId: "indexed", score: 41 },
      { rankScore: 80, oracleId: "unindexed", score: 32 },
    ];
    expect([...rows].sort(byScoreThenOracleId).map((r) => r.oracleId)).toEqual([
      "unindexed",
      "indexed",
    ]);
  });

  it("breaks score ties by ascending oracleId regardless of input order", () => {
    const rows = [
      { rankScore: 7, oracleId: "00000000-0000-0000-0000-00000000000c" },
      { rankScore: 7, oracleId: "00000000-0000-0000-0000-00000000000a" },
      { rankScore: 7, oracleId: "00000000-0000-0000-0000-00000000000b" },
    ];
    const forward = [...rows].sort(byScoreThenOracleId).map((r) => r.oracleId);
    const reversed = [...rows].reverse().sort(byScoreThenOracleId).map((r) => r.oracleId);
    expect(forward).toEqual([
      "00000000-0000-0000-0000-00000000000a",
      "00000000-0000-0000-0000-00000000000b",
      "00000000-0000-0000-0000-00000000000c",
    ]);
    expect(reversed).toEqual(forward);
  });
});

describe("finalizeRecommendations", () => {
  describe("slug uniquing", () => {
    it("assigns base slug when names are unique", () => {
      const scores = [stubScore("Krenko, Mob Boss"), stubScore("Atraxa, Praetors' Voice")];
      const { results } = finalizeRecommendations(scores, 10, 2);
      expect(results[0].slug).toBe("krenko-mob-boss");
      expect(results[1].slug).toBe("atraxa-praetors-voice");
    });

    it("appends -2, -3… for duplicate names in rank order", () => {
      const scores = [
        stubScore("Krenko, Mob Boss", 10),
        stubScore("Krenko, Mob Boss", 5),
        stubScore("Krenko, Mob Boss", 1),
      ];
      const { results } = finalizeRecommendations(scores, 10, 3);
      expect(results[0].slug).toBe("krenko-mob-boss");
      expect(results[1].slug).toBe("krenko-mob-boss-2");
      expect(results[2].slug).toBe("krenko-mob-boss-3");
    });

    it("handles mixed duplicates and uniques", () => {
      const scores = [
        stubScore("Atraxa, Praetors' Voice", 20),
        stubScore("Krenko, Mob Boss", 10),
        stubScore("Krenko, Mob Boss", 5),
      ];
      const { results } = finalizeRecommendations(scores, 15, 3);
      expect(results[0].slug).toBe("atraxa-praetors-voice");
      expect(results[1].slug).toBe("krenko-mob-boss");
      expect(results[2].slug).toBe("krenko-mob-boss-2");
    });

    it("handles split-card names using front face only", () => {
      const scores = [stubScore("Wear // Tear")];
      const { results } = finalizeRecommendations(scores, 5, 1);
      expect(results[0].slug).toBe("wear");
    });
  });

  describe("counts passthrough", () => {
    it("sets uniqueCardsRead and candidateCount from arguments", () => {
      const scores = [stubScore("Krenko, Mob Boss")];
      const { uniqueCardsRead, candidateCount } = finalizeRecommendations(scores, 42, 7);
      expect(uniqueCardsRead).toBe(42);
      expect(candidateCount).toBe(7);
    });

    it("returns empty results with zero counts when no candidates", () => {
      const { results, uniqueCardsRead, candidateCount } = finalizeRecommendations([], 0, 0);
      expect(results).toHaveLength(0);
      expect(uniqueCardsRead).toBe(0);
      expect(candidateCount).toBe(0);
    });
  });

  describe("toListItem", () => {
    it("keeps list fields and drops heavy detail-only fields", () => {
      const score = stubScore("Krenko, Mob Boss", 42);
      score.oracleText = "Tap: create goblins.";
      score.overlapOwned = ["Skirk Prospector"];
      const { results } = finalizeRecommendations([score], 10, 1);
      const item = toListItem(results[0]);
      expect(item).toEqual({
        oracleId: "oracle-Krenko, Mob Boss",
        slug: "krenko-mob-boss",
        name: "Krenko, Mob Boss",
        colorIdentity: [],
        colorPoolSize: 0,
        roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
        edhrecOwnedCount: null,
        edhrecTotal: null,
        receipts: "Skirk Prospector",
        fitPool: 0,
        fitRoles: 0,
        fitSynergy: null,
        synergyState: "ok",
        score: 42,
        measurableTotal: 40,
        imageUri: null,
      });
      expect(item).not.toHaveProperty("oracleText");
      expect(item).not.toHaveProperty("overlapOwned");
      expect(item).not.toHaveProperty("roleCards");
      expect(item).not.toHaveProperty("overlapMissing");
    });
  });

  describe("RankedCommander shape", () => {
    it("preserves all CommanderScore fields alongside slug", () => {
      const score = stubScore("Nekusar, the Mindrazer", 99);
      score.colorIdentity = ["U", "B", "R"];
      score.colorPoolSize = 12;
      const { results } = finalizeRecommendations([score], 20, 1);
      const ranked = results[0];
      expect(ranked.slug).toBe("nekusar-the-mindrazer");
      expect(ranked.name).toBe("Nekusar, the Mindrazer");
      expect(ranked.colorIdentity).toEqual(["U", "B", "R"]);
      expect(ranked.colorPoolSize).toBe(12);
      expect(ranked.score).toBe(99);
    });
  });
});
