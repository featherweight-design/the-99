import { describe, it, expect } from "vitest";
import { listLastSlotsCandidates } from "./last-slots";
import type { SynergyCard } from "../commanders/synergy-cards";

function card(id: string, synergyPts: number, owned: boolean): SynergyCard {
  return { oracleId: id, name: id, typeLine: "Instant", facet: "spell", inclusionPct: null, synergyPts, owned, committedTo: null, availability: null, price: null, manaCost: null };
}

const ranked = [
  card("o1", 90, true), card("u1", 80, false), card("o2", 70, true), card("u2", 60, false),
];

describe("listLastSlotsCandidates", () => {
  it("offers owned and unowned alike, in rank order", () => {
    const out = listLastSlotsCandidates({ ranked, inDeckOracleIds: new Set() });
    expect(out.map((c) => c.oracleId)).toEqual(["o1", "u1", "o2", "u2"]);
  });

  it("drops a card the deck already holds", () => {
    const out = listLastSlotsCandidates({ ranked, inDeckOracleIds: new Set(["u1", "o2"]) });
    expect(out.map((c) => c.oracleId)).toEqual(["o1", "u2"]);
  });

  // The cap belongs to the selection, not the pool: a list truncated at the open
  // slots would hide the cards each tick is being chosen over.
  it("is not capped by the number of open slots", () => {
    const out = listLastSlotsCandidates({ ranked, inDeckOracleIds: new Set() });
    expect(out).toHaveLength(ranked.length);
  });

  it("has nothing to offer when the ranking is empty", () => {
    expect(listLastSlotsCandidates({ ranked: [], inDeckOracleIds: new Set() })).toEqual([]);
  });
});
