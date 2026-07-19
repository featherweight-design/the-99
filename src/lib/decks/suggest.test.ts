import { describe, expect, it } from "vitest";
import { suggestDeck } from "./suggest";
import type { PoolCard } from "../recs/score";

let n = 0;
const card = (over: Partial<PoolCard>): PoolCard => ({
  oracleId: `o-${n++}`, name: `Card ${n}`, typeLine: "Creature",
  oracleText: "", keywords: [], colorIdentity: [], ...over,
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
