import { describe, it, expect } from "vitest";
import {
  orderBySynergy,
  excludeCoveredRoleCards,
  facetCounts,
  type SynergyCard,
} from "./synergy-cards";

function card(over: Partial<SynergyCard> & { oracleId: string }): SynergyCard {
  return {
    name: over.oracleId,
    typeLine: "Creature — Human",
    facet: "creature",
    inclusionPct: null,
    synergyPts: null,
    owned: false,
    ...over,
  };
}

describe("orderBySynergy", () => {
  it("sorts by synergy descending", () => {
    const out = orderBySynergy([
      card({ oracleId: "a", synergyPts: 12 }),
      card({ oracleId: "b", synergyPts: 47 }),
      card({ oracleId: "c", synergyPts: 30 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["b", "c", "a"]);
  });

  // A negative figure is a fact about a matchup, not an absence — it sorts
  // where its value puts it, above the cards with no figure at all.
  it("sorts a negative figure above an absent one", () => {
    const out = orderBySynergy([
      card({ oracleId: "none" }),
      card({ oracleId: "neg", synergyPts: -5 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["neg", "none"]);
  });

  // State 11: EDHREC degraded. Every synergy figure is null, so the ranking has
  // nothing to rank on and falls back to inclusion rather than to the alphabet.
  it("orders by inclusion descending when no row has a synergy figure", () => {
    const out = orderBySynergy([
      card({ oracleId: "a", name: "Aegis", inclusionPct: 12 }),
      card({ oracleId: "z", name: "Zealot", inclusionPct: 91 }),
      card({ oracleId: "m", name: "Mid", inclusionPct: 40 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["z", "m", "a"]);
  });

  it("puts a row with neither figure below a row with an inclusion", () => {
    const out = orderBySynergy([
      card({ oracleId: "blank", name: "Aaa" }),
      card({ oracleId: "some", name: "Zzz", inclusionPct: 3 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["some", "blank"]);
  });

  it("breaks a tie on name so the order is stable across reads", () => {
    const out = orderBySynergy([
      card({ oracleId: "z", name: "Zealot", synergyPts: 9 }),
      card({ oracleId: "a", name: "Aegis", synergyPts: 9 }),
    ]);
    expect(out.map((c) => c.name)).toEqual(["Aegis", "Zealot"]);
  });

  it("does not mutate its input", () => {
    const input = [card({ oracleId: "a", synergyPts: 1 }), card({ oracleId: "b", synergyPts: 2 })];
    orderBySynergy(input);
    expect(input.map((c) => c.oracleId)).toEqual(["a", "b"]);
  });
});

describe("excludeCoveredRoleCards", () => {
  // Decision 4: the exclusion is silent, and it only takes OWNED cards.
  it("drops an owned card Role Coverage already draws", () => {
    const out = excludeCoveredRoleCards(
      [card({ oracleId: "sol", owned: true }), card({ oracleId: "keep", owned: true })],
      new Set(["sol"]),
    );
    expect(out.map((c) => c.oracleId)).toEqual(["keep"]);
  });

  it("keeps an unowned card even when the same id is covered", () => {
    const out = excludeCoveredRoleCards(
      [card({ oracleId: "crypt", owned: false })],
      new Set(["crypt"]),
    );
    expect(out.map((c) => c.oracleId)).toEqual(["crypt"]);
  });
});

describe("facetCounts", () => {
  it("counts each facet and the all scope", () => {
    const counts = facetCounts([
      card({ oracleId: "a", facet: "creature" }),
      card({ oracleId: "b", facet: "creature" }),
      card({ oracleId: "c", facet: "land" }),
    ]);
    expect(counts.creature).toBe(2);
    expect(counts.land).toBe(1);
    expect(counts.spell).toBe(0);
    expect(counts.all).toBe(3);
  });
});
