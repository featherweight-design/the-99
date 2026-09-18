import { describe, it, expect } from "vitest";
import { listLastSlotsCandidates, poolEmptiedByNegativeCut } from "./last-slots";
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

describe("the negative tail", () => {
  const card = (id: string, synergyPts: number | null): SynergyCard => ({
    oracleId: id,
    name: id,
    typeLine: "Instant",
    facet: "spell",
    inclusionPct: 40,
    synergyPts,
    owned: true,
    committedTo: null,
    manaCost: null,
    availability: null,
    price: null,
  });

  it("drops a card whose synergy argues against it", () => {
    // A negative score is EDHREC saying the card appears in this commander's
    // decks LESS than in decks generally. Offering it under a heading that
    // suggests cards makes the player overrule the figure to ignore the row.
    const out = listLastSlotsCandidates({
      ranked: [card("good", 40), card("bad", -12), card("fine", 1)],
      inDeckOracleIds: new Set(),
    });

    expect(out.map((c) => c.oracleId)).toEqual(["good", "fine"]);
  });

  it("keeps a card with no reading at all", () => {
    // Null is no figure — an unscored card, or a degraded read — and silence is
    // not evidence against a card. Only a figure that argues against it is.
    const out = listLastSlotsCandidates({
      ranked: [card("unscored", null)],
      inDeckOracleIds: new Set(),
    });

    expect(out.map((c) => c.oracleId)).toEqual(["unscored"]);
  });

  it("still drops a card the deck already holds, whatever it scores", () => {
    const out = listLastSlotsCandidates({
      ranked: [card("held", 90), card("free", 90)],
      inDeckOracleIds: new Set(["held"]),
    });

    expect(out.map((c) => c.oracleId)).toEqual(["free"]);
  });
});

describe("why the pool is empty", () => {
  const c = (id: string, synergyPts: number | null): SynergyCard => ({
    oracleId: id, name: id, typeLine: "Instant", facet: "spell", inclusionPct: 40,
    synergyPts, owned: true, committedTo: null, manaCost: null, availability: null, price: null,
  });

  it("says so when every offerable card argues against itself", () => {
    // Reachable late in a build rather than exotic: a deck holding every
    // positively-ranked card leaves a ranking that is entirely negative, and the
    // shipped exhaustion sentence claims nothing was ranked at all.
    expect(poolEmptiedByNegativeCut({
      ranked: [c("neg-1", -4), c("neg-2", -1)],
      inDeckOracleIds: new Set(),
    })).toBe(true);
  });

  it("counts the in-deck exclusion first", () => {
    // The positives are all sleeved, so what is LEFT is negative — which is the
    // shape this exists for, and it would read false if the filter ran the other
    // way round.
    expect(poolEmptiedByNegativeCut({
      ranked: [c("held", 50), c("neg-1", -4)],
      inDeckOracleIds: new Set(["held"]),
    })).toBe(true);
  });

  it("is false when the collection simply ran out", () => {
    // Nothing offerable at all is the case the shipped sentence already
    // describes, and it must keep it.
    expect(poolEmptiedByNegativeCut({
      ranked: [c("held", 50)],
      inDeckOracleIds: new Set(["held"]),
    })).toBe(false);
    expect(poolEmptiedByNegativeCut({ ranked: [], inDeckOracleIds: new Set() })).toBe(false);
  });

  it("is false while anything is still offerable", () => {
    expect(poolEmptiedByNegativeCut({
      ranked: [c("neg-1", -4), c("ok", 2)],
      inDeckOracleIds: new Set(),
    })).toBe(false);
    // A null score is not an argument against the card, so it keeps the pool
    // non-empty and this false.
    expect(poolEmptiedByNegativeCut({
      ranked: [c("neg-1", -4), c("unscored", null)],
      inDeckOracleIds: new Set(),
    })).toBe(false);
  });
});
