import { describe, expect, it } from "vitest";
import type { Availability, DeckClaim } from "./availability";
import { summarisePrices } from "./price";
import {
  bucketDraftAdds, changeCount, hasChanges, heldElsewhere, printsPair, pullCandidate, pullHints,
  pullSourceChoices, releasableClaims,
  releasedCopies, unfreeAdds, type DraftAdd, type DraftState,
} from "./draft-state";

const state = (over: Partial<DraftState> = {}): DraftState => ({
  version: null, adds: [], addChanges: [], removes: [],
  names: new Map(), costs: new Map(), prices: new Map(), pullFrom: new Map(),
  claimsKnown: true,
  buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
  pricedCopies: 0, newestAsOf: null, ...over,
});

describe("changeCount / hasChanges", () => {
  it("counts adds and removes together", () => {
    expect(changeCount(state({
      adds: [{ oracleId: "a", needed: 1, shortfall: 1, bucket: "unowned", heldBy: [] }],
      removes: [{ oracleId: "r", from: 1, to: 0 }],
    }))).toBe(2);
  });

  // A basic is a row like any other, so the count that drives every chip is
  // also the whole test of whether the draft differs. There is no second
  // question and no flag beside the figure.
  it("counts a basics-only edit like any other change", () => {
    const basicsOnly = state({ removes: [{ oracleId: "swamp", from: 5, to: 0 }] });
    expect(changeCount(basicsOnly)).toBe(1);
    expect(hasChanges(basicsOnly)).toBe(true);
  });

  it("calls an untouched draft unchanged", () => {
    expect(hasChanges(state())).toBe(false);
  });
});

// Copies, because the figure is printed beside `buyCount`, which counts copies.
describe("releasedCopies", () => {
  it("counts copies rather than rows", () => {
    expect(releasedCopies(state({
      removes: [{ oracleId: "a", from: 3, to: 1 }, { oracleId: "b", from: 1, to: 0 }],
    }))).toBe(3);
  });

  // Five Swamps come out of the sleeve, and that is the figure "back in the
  // pool" prints. A cut basic is released stock whatever the claim model says
  // about it, which is nothing.
  it("counts a cut basic's copies", () => {
    expect(releasedCopies(state({
      removes: [{ oracleId: "swamp", from: 5, to: 0 }],
    }))).toBe(5);
  });

  it("releases nothing on a draft that cut nothing", () => {
    expect(releasedCopies(state())).toBe(0);
  });
});

// The degradation path the whole `DraftAdd` type exists for: a claim read that
// failed must not be rendered as a claim read that came back empty.
describe("bucketDraftAdds / unfreeAdds", () => {
  const adds = [
    { oracleId: "a", from: 0, to: 2 },
    { oracleId: "b", from: 1, to: 2 },
  ];

  // `free` is the surplus with this draft's whole ask already subtracted, so
  // `a` owning two and asking two is covered exactly and `b` owning none and
  // asking two is two copies short.
  it("buckets against a read that came back", () => {
    const bucketed = bucketDraftAdds(adds, new Map([
      ["a", { owned: 2, hard: 0, soft: 0, free: 0, claims: [] }],
      ["b", { owned: 0, hard: 0, soft: 0, free: -2, claims: [] }],
    ]));
    expect(bucketed.map((a) => a.bucket)).toEqual(["free", "unowned"]);
    expect(unfreeAdds(bucketed).map((a) => a.oracleId)).toEqual(["b"]);
  });

  // The shape that shipped a pull nobody could act on usefully. One owned copy,
  // this deck sleeved with the senior claim on it, another deck sleeved behind it,
  // and the draft raising its ask to two. `free` already excludes the junior
  // claim, so taking that copy out of its box would leave this deck one short all
  // the same — the honest answer is a purchase, not an offer.
  it("offers no pull when the only holder is junior to this deck", () => {
    const junior: DeckClaim = {
      id: "d-junior", name: "Prismari Artistry", quantity: 1,
      mature: true, pending: false, commander: false, senior: false,
    };
    const bucketed = bucketDraftAdds([{ oracleId: "b", from: 1, to: 2 }], new Map([
      ["b", { owned: 1, hard: 1, soft: 0, free: -1, claims: [junior] }],
    ]));
    expect(bucketed.map((a) => a.bucket)).toEqual(["unowned"]);
    expect(bucketed[0].heldBy).toEqual([]);
    expect(bucketed[0].shortfall).toBe(1);
  });

  // The same figures with the holder senior — the Fabled Passage case, where this
  // deck has not sleeved the card at all. Releasing that copy does move `free`.
  it("offers the pull when the holder is senior", () => {
    const senior: DeckClaim = {
      id: "d-senior", name: "Prismari Artistry", quantity: 1,
      mature: true, pending: false, commander: false, senior: true,
    };
    const bucketed = bucketDraftAdds([{ oracleId: "b", from: 0, to: 1 }], new Map([
      ["b", { owned: 1, hard: 1, soft: 0, free: -1, claims: [senior] }],
    ]));
    expect(bucketed.map((a) => a.bucket)).toEqual(["claimed"]);
    expect(bucketed[0].heldBy.map((d) => d.name)).toEqual(["Prismari Artistry"]);
  });

  // A basic is answered before the map is consulted, so it is free on a read
  // that came back empty and on one that never happened. Without this an added
  // Forest has no entry, buckets `unowned`, and reaches a shopping list.
  it("buckets a basic free whatever the claim read did", () => {
    const basics = new Set(["forest"]);
    const forest = [{ oracleId: "forest", from: 0, to: 5 }];
    const answered = bucketDraftAdds(forest, new Map(), basics);
    const failed = bucketDraftAdds(forest, null, basics);
    const expected = [
      { oracleId: "forest", needed: 5, shortfall: 0, bucket: "free", heldBy: [] },
    ];
    expect(answered).toEqual(expected);
    expect(failed).toEqual(expected);
    // And free is not unfree, so nothing about a Forest is ever priced.
    expect(unfreeAdds(failed)).toEqual([]);
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

// One rule for the review page, the pending banner and the version rail, which
// held three copies of it. The three surfaces describing the same move
// differently is the failure this exists to prevent.
describe("printsPair", () => {
  // What the column heading already said. `Coming in` over `Sol Ring 0 → 1` is
  // the heading restated beside every name in the column.
  it("says nothing for a single copy arriving or leaving", () => {
    expect(printsPair({ from: 0, to: 1 })).toBe(false);
    expect(printsPair({ from: 1, to: 0 })).toBe(false);
  });

  // The reported defect. Five Swamps out of the sleeve read as one until basic
  // lands were drawn, because no other row could ever lose more than a copy.
  it("prints the pair on a whole cut of more than one copy", () => {
    expect(printsPair({ from: 5, to: 0 })).toBe(true);
  });

  it("prints it on a whole add of more than one copy", () => {
    expect(printsPair({ from: 0, to: 5 })).toBe(true);
  });

  it("prints it on a recount", () => {
    expect(printsPair({ from: 1, to: 2 })).toBe(true);
    expect(printsPair({ from: 5, to: 4 })).toBe(true);
  });
});

describe("releasableClaims", () => {
  const claim = (over: Partial<DeckClaim> = {}): DeckClaim => ({
    id: "d-1", name: "Kykar, Wind's Fury", quantity: 1,
    mature: true, pending: false, commander: false, senior: true, ...over,
  });
  const availability = (claims: DeckClaim[]): Availability =>
    ({ owned: 1, hard: 1, soft: 0, free: 0, claims });

  it("keeps a mature holder a pull could be offered against", () => {
    expect(releasableClaims(availability([claim()])).map((c) => c.id)).toEqual(["d-1"]);
  });

  // A pull joins the holder's draft rather than committing it (Hugh, 2026-09-27), so a draft of
  // its own no longer stands in the way.
  it("keeps a holder with a draft of its own", () => {
    expect(releasableClaims(availability([claim({ pending: true })])).map((c) => c.id)).toEqual(["d-1"]);
  });

  // No route releases a commander, so there is not even a "go and fix it there".
  it("excludes a holder claiming it as its commander", () => {
    expect(releasableClaims(availability([claim({ commander: true })]))).toEqual([]);
  });

  // Seniority already leaves a junior claim out of this deck's `free`, so the
  // server would take the copy and the shortfall would not move.
  it("excludes a holder junior to this deck on the card", () => {
    expect(releasableClaims(availability([claim({ senior: false })]))).toEqual([]);
  });

  // A brew's claim is soft: nothing has to be released for the card to be used.
  it("excludes an immature claim", () => {
    expect(releasableClaims(availability([claim({ mature: false })]))).toEqual([]);
  });

  // L2: Pull it never takes from a deck where the card is locked.
  it("excludes a holder that has locked the card", () => {
    expect(releasableClaims(availability([claim({ locked: true })]))).toEqual([]);
  });

  it("reads a card nobody claims as nothing to release", () => {
    expect(releasableClaims(undefined)).toEqual([]);
  });
});

describe("pullHints", () => {
  const claim = (over: Partial<DeckClaim> = {}): DeckClaim => ({
    id: "d-1", name: "Kykar, Wind's Fury", quantity: 1,
    mature: true, pending: false, commander: false, senior: true, ...over,
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
    expect(pullHints([add()], availability([claim({ commander: true })])).size).toBe(0);
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
    mature: true, pending: false, commander: false, senior: true, ...over,
  });
  const availability = (claims: DeckClaim[]): Availability =>
    ({ owned: 1, hard: 1, soft: 0, free: 0, claims });

  it("prefers the holder the pull can be offered against", () => {
    const chosen = pullCandidate(availability([
      claim({ id: "d-guarded", commander: true }),
      claim({ id: "d-free" }),
    ]));
    expect(chosen?.id).toBe("d-free");
  });

  // A holder with a draft is releasable, so it wins over a commander guard like any other.
  it("offers a holder with a draft over a commander guard", () => {
    const chosen = pullCandidate(availability([
      claim({ id: "d-pending", pending: true }),
      claim({ id: "d-commander", commander: true }),
    ]));
    expect(chosen?.id).toBe("d-pending");
  });

  // L2: a locked holder is a guard like the other two, so the row names the deck that holds the
  // copy. A commander guard is named ahead of it, being the more permanent.
  it("hands a locked claim to the control as a guard, after a commander", () => {
    expect(pullCandidate(availability([claim({ id: "d-locked", locked: true })]))?.id).toBe("d-locked");
    expect(pullCandidate(availability([
      claim({ id: "d-locked", locked: true, pending: true }),
    ]))?.id).toBe("d-locked");
    expect(pullCandidate(availability([
      claim({ id: "d-locked", locked: true }),
      claim({ id: "d-commander", commander: true }),
    ]))?.id).toBe("d-commander");
  });

  // A releasable holder still wins: a lock in one deck never hides a copy another deck can give.
  it("offers the releasable holder over a locked one", () => {
    expect(pullCandidate(availability([
      claim({ id: "d-locked", locked: true }),
      claim({ id: "d-free" }),
    ]))?.id).toBe("d-free");
  });

  it("draws nothing for a card with no sleeved holder", () => {
    expect(pullCandidate(availability([claim({ mature: false })]))).toBeNull();
    expect(pullCandidate(undefined)).toBeNull();
  });

});

// Addendum R1 (Pull it picks its source deck): the full picker list, as opposed to
// `pullCandidate`'s single pick.
describe("pullSourceChoices", () => {
  const claim = (over: Partial<DeckClaim> = {}): DeckClaim => ({
    id: "d-1", name: "Kykar, Wind's Fury", quantity: 1,
    mature: true, pending: false, commander: false, senior: true, ...over,
  });
  const availability = (claims: DeckClaim[]): Availability =>
    ({ owned: 1, hard: 1, soft: 0, free: 0, claims });

  // The array itself is ordered alphabetically by deck NAME (`availability-query.ts`'s own
  // `order by cd.name`), deliberately the opposite of `since` order here — a sort that
  // accidentally matched the input order would pass with no sort at all.
  it("sorts by since ascending, not by the array's own (alphabetical) order", () => {
    const ids = pullSourceChoices(availability([
      claim({ id: "d-b-newest", name: "B Newest", since: 3000 }),
      claim({ id: "d-a-oldest", name: "A Oldest", since: 1000 }),
      claim({ id: "d-c-middle", name: "C Middle", since: 2000 }),
    ])).map((c) => c.id);
    expect(ids).toEqual(["d-a-oldest", "d-c-middle", "d-b-newest"]);
  });

  it("includes a locked and a commander claim, disabled rows rather than excluded", () => {
    const ids = pullSourceChoices(availability([
      claim({ id: "d-free", since: 1000 }),
      claim({ id: "d-locked", locked: true, senior: false, since: 2000 }),
      claim({ id: "d-commander", commander: true, senior: false, since: 3000 }),
    ])).map((c) => c.id);
    expect(ids).toEqual(["d-free", "d-locked", "d-commander"]);
  });

  // A junior sleeved holder is neither pullable nor explainable by a guard tag — excluded,
  // same as `pullCandidate`'s own silence on it.
  it("excludes a junior sleeved holder that is none of senior, locked or commander", () => {
    expect(pullSourceChoices(availability([claim({ senior: false })]))).toEqual([]);
  });

  it("excludes a draft-only (immature) holder", () => {
    expect(pullSourceChoices(availability([claim({ mature: false })]))).toEqual([]);
  });

  it("is empty for undefined availability", () => {
    expect(pullSourceChoices(undefined)).toEqual([]);
  });
});

// The ownership dot's third state. The bucket cannot answer it: `claimed` means
// "a pull would relieve this", so a card whose only sleeved holder is junior to
// this deck buckets `unowned` while its copy sits in somebody's box.
describe("heldElsewhere", () => {
  const claim = (over: Partial<DeckClaim> = {}): DeckClaim => ({
    id: "d-1", name: "Prismari Artistry", quantity: 1,
    mature: true, pending: false, commander: false, senior: true, ...over,
  });
  const availability = (claims: DeckClaim[]): Availability =>
    ({ owned: 1, hard: 1, soft: 0, free: -1, claims });

  // The row the defect painted as a free owned copy: the one copy is sleeved in a
  // deck junior to this one, so no pull can relieve the shortfall and the card is
  // still spoken for.
  it("reads a short row held only by a junior deck as held", () => {
    expect(heldElsewhere(availability([claim({ senior: false })]), 1)).toBe(true);
  });

  it("reads a short row held by a releasable deck as held", () => {
    expect(heldElsewhere(availability([claim()]), 1)).toBe(true);
  });

  // Four copies owned and one added is not short. Another deck holding one of the
  // four says nothing about this row, and painting it committed would be a lie.
  it("reads a row with no shortfall as free, however many decks hold the card", () => {
    expect(heldElsewhere(availability([claim(), claim({ id: "d-2" })]), 0)).toBe(false);
  });

  // A brew sleeves nothing: its claim is soft, so the copy is still available.
  it("reads a card held only by a brew as free", () => {
    expect(heldElsewhere(availability([claim({ mature: false })]), 1)).toBe(false);
  });

  it("reads a card nobody holds, and a failed claim read, as free", () => {
    expect(heldElsewhere(availability([]), 1)).toBe(false);
    expect(heldElsewhere(undefined, 1)).toBe(false);
    expect(heldElsewhere(null, 1)).toBe(false);
  });
});


describe("a printed add costs nothing", () => {
  const add = (oracleId: string) => ({ oracleId, from: 0, to: 1 });

  it("is left out of the purchase set", () => {
    // `unfreeAdds` drives `unfreeCount`, which prices load against and which the
    // banner reads as "N of the M are short of spare copies". A printed add has
    // a shortfall of zero, so counting it says a card is short when it is not.
    const bucketed = bucketDraftAdds([add("a")], new Map(), new Set(), new Set(["a"]));
    expect(bucketed[0].bucket).toBe("proxied");
    expect(unfreeAdds(bucketed)).toEqual([]);
  });

  it("is answered even when the claim read failed", () => {
    // A null availability map is a failed claim read. A printed card asks the
    // collection for nothing, which is true whether or not that query ran.
    const bucketed = bucketDraftAdds([add("a")], null, new Set(), new Set(["a"]));
    expect(bucketed[0].bucket).toBe("proxied");
    expect(unfreeAdds(bucketed)).toEqual([]);
  });

  it("still counts an unprinted add", () => {
    const bucketed = bucketDraftAdds([add("a")], new Map(), new Set(), new Set());
    expect(unfreeAdds(bucketed)).toHaveLength(1);
  });
});
