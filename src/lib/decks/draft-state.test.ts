import { describe, expect, it } from "vitest";
import type { Availability, DeckClaim } from "./availability";
import { changeCount, hasChanges, releasableClaims, type DraftState } from "./draft-state";

const state = (over: Partial<DraftState> = {}): DraftState => ({
  version: null, adds: [], addChanges: [], removes: [], basicsChanged: false,
  names: new Map(), claimsKnown: true, buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
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
