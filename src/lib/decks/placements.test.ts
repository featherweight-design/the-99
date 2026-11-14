import { describe, expect, it } from "vitest";
import { foldCount, placementsOf } from "./placements";
import { allocateClaims } from "./allocate";
import type { Availability } from "./availability";

const claim = (id: string, since: number | null, quantity = 1, mature = true, granted = 0) =>
  ({ id, name: `deck ${id}`, quantity, mature, since, granted }) as Availability["claims"][number];
const brew = (id: string, granted = 0) => claim(id, null, 1, false, granted);
const snap = (owned: number, claims: Availability["claims"]) => ({ owned, claims });

describe("placementsOf", () => {
  it("names the committed deck seniority gave the new copy", () => {
    const claims = [claim("a", 1), claim("b", 2)];
    expect(placementsOf(snap(1, claims), snap(2, claims))).toEqual({
      held: [{ deckId: "b", deckName: "deck b", copies: 1, picked: false }],
      soft: [],
      unplaced: 0,
    });
  });

  it("counts copies per deck, so two copies to one deck are not two decks", () => {
    const claims = [claim("a", 1, 2), claim("b", 2)];
    expect(placementsOf(snap(0, claims), snap(3, claims)).held).toEqual([
      { deckId: "a", deckName: "deck a", copies: 2, picked: false },
      { deckId: "b", deckName: "deck b", copies: 1, picked: false },
    ]);
  });

  it("marks a deck whose granted reservation the add filled as picked", () => {
    const before = snap(1, [claim("a", 1), claim("b", 2, 1, true, 0)]);
    const after = snap(2, [claim("a", 1), claim("b", 2, 1, true, 1)]);
    expect(placementsOf(before, after).held).toEqual([
      { deckId: "b", deckName: "deck b", copies: 1, picked: true },
    ]);
  });

  it("puts a brew's soft share in soft, never in held", () => {
    const claims = [claim("a", 1), brew("k"), brew("g")];
    const p = placementsOf(snap(1, claims), snap(2, claims));
    expect(p.held).toEqual([]);
    expect(p.soft.map((s) => s.deckId)).toEqual(["g", "k"]);
    // The copy is loose: every brew reads it, and none holds it.
    expect(p.unplaced).toBe(1);
  });

  it("holds a brew only for the copy the player gave it", () => {
    const before = snap(1, [claim("a", 1), brew("k", 0)]);
    const after = snap(2, [claim("a", 1), brew("k", 1)]);
    expect(placementsOf(before, after)).toEqual({
      held: [{ deckId: "k", deckName: "deck k", copies: 1, picked: true }],
      soft: [],
      unplaced: 0,
    });
  });

  it("reports a copy nobody needed as unplaced", () => {
    const claims = [claim("a", 1)];
    expect(placementsOf(snap(1, claims), snap(2, claims))).toEqual({ held: [], soft: [], unplaced: 1 });
  });

  it("reads a missing snapshot as nothing held", () => {
    expect(placementsOf(null, snap(1, [claim("a", 1)])).held).toEqual([
      { deckId: "a", deckName: "deck a", copies: 1, picked: false },
    ]);
    expect(placementsOf(snap(1, [claim("a", 1)]), null)).toEqual({ held: [], soft: [], unplaced: 0 });
  });
});

describe("foldCount", () => {
  const committed = (n: number) => Array.from({ length: n }, (_, i) => claim(`c${i}`, i + 1));
  const claimants = (owned: number, claims: Availability["claims"]) => allocateClaims({ owned, claims });

  it("folds every senior holder but the one the new copy could leave (variant `one`)", () => {
    // 17 committed, 17 owned after one arrived: the junior-most holder is the one a pick moves.
    const cs = claimants(17, [...committed(17), brew("k"), brew("g"), brew("t")]);
    expect(foldCount(cs, 1, 17)).toBe(16);
  });

  it("folds all the holders when the new copy is a spare (variant `brews`)", () => {
    const cs = claimants(18, [...committed(17), brew("k"), brew("g"), brew("t")]);
    expect(foldCount(cs, 1, 18)).toBe(17);
  });

  it("folds one fewer holder per extra copy in play", () => {
    const cs = claimants(18, committed(18));
    expect(foldCount(cs, 2, 18)).toBe(16);
  });

  it("never folds a granted deck, and stops there", () => {
    const claims = committed(5);
    claims[2] = claim("c2", 3, 1, true, 1);
    expect(foldCount(claimants(5, claims), 1, 5)).toBe(2);
  });

  it("keeps an older pick but drops a pick made for this arrival (receiptAt)", () => {
    // 10 committed decks, 10 owned after one arrived. The player gave the new copy to c9 AFTER the receipt (grantedAt 200 >= 100):
    // c8 still keeps its copy whatever a pick does, so the fold stays 9, as it was before the pick.
    const claims = committed(10);
    claims[9] = { ...claim("c9", 10, 1, true, 1), grantedAt: 200 } as Availability["claims"][number];
    const cs = claimants(10, claims);
    expect(foldCount(cs, 1, 10, 100)).toBe(9);
    // The same pick made BEFORE the receipt is an older reservation: the queue never had that copy, so c8 no longer folds.
    expect(foldCount(cs, 1, 10, 300)).toBe(8);
    // No receipt (a chooser built before any pick): every grant is older and stays.
    expect(foldCount(cs, 1, 10)).toBe(8);
  });

  it("lets no pick spend the counterfactual's supply: a picked trailing brew does not shrink the fold", () => {
    // The reviewer's case: 17 committed, 17 owned, one copy in play, the pick on a trailing brew.
    const cs = claimants(17, [...committed(17), brew("k", 1)]);
    expect(foldCount(cs, 1, 17)).toBe(16);
  });

  it("keeps a junior deck's earlier pick, so the deck the new copy went to stays an option", () => {
    // 22 committed decks want it, 21 owned after one arrived, c20 was granted a copy before. Seniority
    // gave the new copy to c19 (the receipt's deck); dropping the old grant would cover c19 and fold it.
    const claims = committed(22);
    claims[20] = claim("c20", 21, 1, true, 1);
    const cs = claimants(21, claims);
    expect(cs[19].allocated).toBe(1);
    expect(foldCount(cs, 1, 21)).toBe(19);
  });

  it("folds nothing when the head of the queue is short", () => {
    expect(foldCount(claimants(1, committed(3)), 1, 1)).toBe(0);
  });
});
