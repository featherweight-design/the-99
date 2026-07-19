import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isCommanderCandidate, scoreCommander, type PoolCard } from "./score";

const card = (over: Partial<PoolCard>): PoolCard => ({
  oracleId: over.oracleId ?? randomUUID(),
  name: "X", typeLine: "Creature", oracleText: "", keywords: [], colorIdentity: [],
  ...over,
});

describe("isCommanderCandidate", () => {
  it("accepts legendary creatures", () => {
    expect(isCommanderCandidate({ typeLine: "Legendary Creature — Elf", oracleText: "" })).toBe(true);
  });
  it("accepts 'can be your commander' cards", () => {
    expect(isCommanderCandidate({
      typeLine: "Legendary Planeswalker — Teferi",
      oracleText: "Teferi, Temporal Archmage can be your commander.",
    })).toBe(true);
  });
  it("rejects ordinary cards", () => {
    expect(isCommanderCandidate({ typeLine: "Instant", oracleText: "Draw a card." })).toBe(false);
  });
});

describe("scoreCommander", () => {
  const commander = card({ name: "Golgari Guy", typeLine: "Legendary Creature", colorIdentity: ["B", "G"] });
  const collection = [
    card({ name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.", colorIdentity: [] }),
    card({ name: "Cultivate", typeLine: "Sorcery", oracleText: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", colorIdentity: ["G"] }),
    card({ name: "Read the Bones", typeLine: "Sorcery", oracleText: "Draw two cards.", colorIdentity: ["B"] }),
    card({ name: "Lightning Bolt", typeLine: "Instant", oracleText: "Deals 3 damage to any target", colorIdentity: ["R"] }), // off-color
  ];

  it("counts only color-legal cards in the pool", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Cultivate"] });
    expect(s.colorPoolSize).toBe(3); // Bolt excluded
  });

  it("counts owned EDHREC top cards (color-legal only)", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Lightning Bolt", "Craterhoof Behemoth"] });
    expect(s.edhrecOwnedCount).toBe(1);
    expect(s.edhrecTotal).toBe(3);
  });

  it("reports role counts and gaps against targets", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.roleCounts).toEqual({ ramp: 2, draw: 1, removal: 0 });
    expect(s.roleGaps).toEqual(["ramp", "draw", "removal"]);
  });

  it("degrades: null edhrec fields but still scores by pool+roles", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.edhrecOwnedCount).toBeNull();
    expect(s.score).toBeGreaterThan(0);
  });

  it("ranks a commander with more EDHREC overlap higher, all else equal", () => {
    const low = scoreCommander({ commander, collection, edhrecTopCards: ["Craterhoof Behemoth"] });
    const high = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Cultivate", "Read the Bones"] });
    expect(high.score).toBeGreaterThan(low.score);
  });
});
