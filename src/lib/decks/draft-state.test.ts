import { describe, expect, it } from "vitest";
import type { Availability, DeckClaim } from "./availability";
import { summarisePrices } from "./price";
import {
  bucketDraftAdds, changeCount, hasChanges, pullCandidate, pullHints, releasableClaims,
  unfreeAdds, type DraftAdd, type DraftState,
} from "./draft-state";

const state = (over: Partial<DraftState> = {}): DraftState => ({
  version: null, adds: [], addChanges: [], removes: [], basicsChanged: false,
  names: new Map(), costs: new Map(), prices: new Map(), pullFrom: new Map(),
  claimsKnown: true,
  buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
  pricedCopies: 0, newestAsOf: null,
  manaValue: null, manaValueBefore: null, ...over,
});

describe("changeCount / hasChanges", () => {
  it("counts adds and removes together", () => {
    expect(changeCount(state({
      adds: [{ oracleId: "a", needed: 1, shortfall: 1, bucket: "unowned", heldBy: [] }],
      removes: [{ oracleId: "r", from: 1, to: 0 }],
    }))).toBe(2);
  });

  it("counts a basics-only edit in no figure", () => {
    expect(changeCount(state({ basicsChanged: true }))).toBe(0);
  });

  it("still calls a basics-only edit a change — it has to be committable", () => {
    expect(hasChanges(state({ basicsChanged: true }))).toBe(true);
  });

  it("calls an untouched draft unchanged", () => {
    expect(hasChanges(state())).toBe(false);
  });
});

// The degradation path the whole `DraftAdd` type exists for: a claim read that
// failed must not be rendered as a claim read that came back empty.
describe("bucketDraftAdds / unfreeAdds", () => {
  const adds = [
    { oracleId: "a", from: 0, to: 2 },
    { oracleId: "b", from: 1, to: 2 },
  ];

  it("buckets against a read that came back", () => {
    const bucketed = bucketDraftAdds(adds, new Map([
      ["a", { owned: 2, hard: 0, soft: 0, free: 2, claims: [] }],
      ["b", { owned: 0, hard: 0, soft: 0, free: 0, claims: [] }],
    ]));
    expect(bucketed.map((a) => a.bucket)).toEqual(["free", "unowned"]);
    expect(unfreeAdds(bucketed).map((a) => a.oracleId)).toEqual(["b"]);
  });

  it("calls nothing unowned when the read failed, and quotes no purchase", () => {
    const bucketed = bucketDraftAdds(adds, null);
    // Every add keeps its place, `needed` still states the ask, and neither the
    // bucket nor the shortfall makes a claim the failed read cannot support.
    expect(bucketed).toEqual([
      { oracleId: "a", needed: 2, shortfall: 0, bucket: null, heldBy: [] },
      { oracleId: "b", needed: 1, shortfall: 0, bucket: null, heldBy: [] },
    ]);
    expect(unfreeAdds(bucketed)).toEqual([]);
    // No unfree rows is no priced copies, and `total` is null on a zero — so the
    // banner states no figure rather than "this commit asks for nothing".
    expect(summarisePrices([], null).pricedCopies).toBe(0);
  });
});

describe("releasableClaims", () => {
  const claim = (over: Partial<DeckClaim> = {}): DeckClaim => ({
    id: "d-1", name: "Kykar, Wind's Fury", quantity: 1,
    mature: true, pending: false, commander: false, ...over,
  });
  const availability = (claims: DeckClaim[]): Availability =>
    ({ owned: 1, hard: 1, soft: 0, free: 0, claims });

  it("keeps a mature holder a pull could be offered against", () => {
    expect(releasableClaims(availability([claim()])).map((c) => c.id)).toEqual(["d-1"]);
  });

  // Committing the source deck to release one card would sweep its owner's
  // half-finished tinkering into a version nobody asked for, so the server
  // refuses — and a control that can only fail must not be drawn.
  it("excludes a holder with pending changes of its own", () => {
    expect(releasableClaims(availability([claim({ pending: true })]))).toEqual([]);
  });

  // No route releases a commander, so there is not even a "go and fix it there".
  it("excludes a holder claiming it as its commander", () => {
    expect(releasableClaims(availability([claim({ commander: true })]))).toEqual([]);
  });

  // A brew's claim is soft: nothing has to be released for the card to be used.
  it("excludes an immature claim", () => {
    expect(releasableClaims(availability([claim({ mature: false })]))).toEqual([]);
  });

  it("reads a card nobody claims as nothing to release", () => {
    expect(releasableClaims(undefined)).toEqual([]);
  });
});

describe("pullHints", () => {
  const claim = (over: Partial<DeckClaim> = {}): DeckClaim => ({
    id: "d-1", name: "Kykar, Wind's Fury", quantity: 1,
    mature: true, pending: false, commander: false, ...over,
  });
  const add = (over: Partial<DraftAdd> = {}): DraftAdd => ({
    oracleId: "o1", needed: 1, shortfall: 1, bucket: "claimed", heldBy: [], ...over,
  });
  const availability = (claims: DeckClaim[]): Map<string, Availability> =>
    new Map([["o1", { owned: 1, hard: 1, soft: 0, free: 0, claims }]]);

  it("names the releasable holder of a claimed add", () => {
    expect(pullHints([add()], availability([claim()])).get("o1")).toBe("Kykar, Wind's Fury");
  });

  // The row is free because the collection has a spare copy. Another deck
  // holding one too changes nothing: there is no purchase to avoid, and
  // `pullableCount` does not count the row either.
  it("offers no pull on a free add, even when a releasable deck holds one", () => {
    expect(pullHints([add({ bucket: "free", shortfall: 0 })], availability([claim()])).size).toBe(0);
  });

  it("offers no pull when every holder is refused", () => {
    expect(pullHints([add()], availability([claim({ pending: true })])).size).toBe(0);
  });

  // The failed claim read: nothing is known about who holds the card, so no
  // offer can be made — the same degradation every other figure takes.
  it("offers no pull when the claim read failed", () => {
    expect(pullHints([add({ bucket: null, shortfall: 0 })], null).size).toBe(0);
  });
});

// Which claim the review row hands its control. The same three flags decide it,
// but this one has to return a claim where `releasableClaims` returns none —
// that is the row that draws a guard instead of an offer.
describe("pullCandidate", () => {
  const claim = (over: Partial<DeckClaim> = {}): DeckClaim => ({
    id: "d-1", name: "Kykar, Wind's Fury", quantity: 1,
    mature: true, pending: false, commander: false, ...over,
  });
  const availability = (claims: DeckClaim[]): Availability =>
    ({ owned: 1, hard: 1, soft: 0, free: 0, claims });

  it("prefers the holder the pull can be offered against", () => {
    const chosen = pullCandidate(availability([
      claim({ id: "d-guarded", pending: true }),
      claim({ id: "d-free" }),
    ]));
    expect(chosen?.id).toBe("d-free");
  });

  // The permanent obstacle is the more useful one to name: a pending deck can be
  // opened and released, a commander claim never can.
  it("names a commander claim ahead of a pending one", () => {
    const chosen = pullCandidate(availability([
      claim({ id: "d-pending", pending: true }),
      claim({ id: "d-commander", commander: true }),
    ]));
    expect(chosen?.id).toBe("d-commander");
  });

  it("draws nothing for a card with no sleeved holder", () => {
    expect(pullCandidate(availability([claim({ mature: false })]))).toBeNull();
    expect(pullCandidate(undefined)).toBeNull();
  });
});
