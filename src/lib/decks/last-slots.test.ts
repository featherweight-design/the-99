import { describe, it, expect } from "vitest";
import { planLastSlots } from "./last-slots";
import type { SynergyCard } from "../commanders/synergy-cards";

function card(id: string, synergyPts: number, owned: boolean): SynergyCard {
  return { oracleId: id, name: id, typeLine: "Instant", facet: "spell", inclusionPct: null, synergyPts, owned };
}

const ranked = [
  card("o1", 90, true), card("u1", 80, false), card("o2", 70, true), card("u2", 60, false),
];

describe("planLastSlots", () => {
  // State 1: deep pool.
  it("takes owned cards in synergy order up to the open slots", () => {
    const out = planLastSlots({ ranked, openSlots: 2, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual(["o1", "o2"]);
    expect(out.shortfall).toBe(0);
  });

  // State 2: shallow pool — the control states what it can place, never the gap.
  it("reports the shortfall when the pool runs out", () => {
    const out = planLastSlots({ ranked, openSlots: 5, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual(["o1", "o2"]);
    expect(out.shortfall).toBe(3);
  });

  // The top-up is the same iteration without the ownership filter.
  it("takes any card in synergy order when ownership is not required", () => {
    const out = planLastSlots({ ranked, openSlots: 3, inDeckOracleIds: new Set(), ownedOnly: false });
    expect(out.place).toEqual(["o1", "u1", "o2"]);
  });

  it("skips a card the deck already holds", () => {
    const out = planLastSlots({ ranked, openSlots: 2, inDeckOracleIds: new Set(["o1"]), ownedOnly: true });
    expect(out.place).toEqual(["o2"]);
    expect(out.shortfall).toBe(1);
  });

  // State 9: no open slots — the strip unmounts, and the plan places nothing.
  it("places nothing when there are no open slots", () => {
    const out = planLastSlots({ ranked, openSlots: 0, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual([]);
    expect(out.shortfall).toBe(0);
  });

  // State 6 / 12: no candidates at all.
  it("reports every slot short when no candidate qualifies", () => {
    const out = planLastSlots({ ranked: [], openSlots: 4, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual([]);
    expect(out.shortfall).toBe(4);
  });
});
