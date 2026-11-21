import { describe, it, expect } from "vitest";
import { previewAllocation } from "./preview-allocation";
import type { ContestedClaimant } from "../collection/summary-read";

const AUG = Date.parse("2026-08-01T00:00:00Z");
const SEP = Date.parse("2026-09-01T00:00:00Z");

/**
 * Claimants are given in QUEUE ORDER — `(since, deckId)` — because that is the order they arrive
 * in from `buildContestedCard` and the order `allocate` consumes them in. A fixture that lists
 * them any other way is testing a state the row cannot be in.
 */
function claimant(over: Partial<ContestedClaimant> & { deckId: string }): ContestedClaimant {
  return {
    deckName: over.deckId,
    quantity: 1,
    commanderCopies: 0,
    granted: 0,
    since: AUG,
    versionNumber: 1,
    allocated: 0,
    ...over,
  };
}

const allocOf = (rows: ContestedClaimant[]) =>
  Object.fromEntries(rows.map((r) => [r.deckId, r.allocated]));

describe("previewAllocation", () => {
  it("moves the copy to the deck just picked, and off the one that held it", () => {
    // The bug this exists for: the picked deck went accent while the previous holder stayed
    // filled until the server answered, so both marks read full on a card with one copy.
    const rows = previewAllocation(
      [claimant({ deckId: "senior", since: AUG }), claimant({ deckId: "junior", since: SEP })],
      1,
      new Set(["junior"]),
    );
    expect(allocOf(rows)).toEqual({ senior: 0, junior: 1 });
  });

  it("gives the copy back to the senior deck when the pick is cleared", () => {
    const rows = previewAllocation(
      [claimant({ deckId: "senior", since: AUG }), claimant({ deckId: "junior", since: SEP })],
      1,
      new Set(),
    );
    expect(allocOf(rows)).toEqual({ senior: 1, junior: 0 });
  });

  it("drops a grant the row was already carrying when that deck is no longer picked", () => {
    const rows = previewAllocation(
      [
        claimant({ deckId: "senior", since: AUG }),
        claimant({ deckId: "was-granted", since: SEP, granted: 1, allocated: 1 }),
      ],
      1,
      new Set(["senior"]),
    );
    expect(allocOf(rows)).toEqual({ senior: 1, "was-granted": 0 });
  });

  // THE THREE CASES BELOW ARE THE DIVERGENCES. Each one passed against the first version of this
  // file, which was written from `allocate`'s prose rather than calling it, and each produced a
  // preview the server's own answer then contradicted — the same flicker, pointing the other way.

  it("distributes every copy owned, not only the copies an import brought", () => {
    // The receipt's `inPlay` is the ARRIVAL, which is smaller than the supply whenever a deck
    // already held a copy. Distributing it starved the senior deck: it read `buys it` for one
    // round trip and then flipped back.
    const rows = previewAllocation(
      [claimant({ deckId: "senior", since: AUG }), claimant({ deckId: "junior", since: SEP, quantity: 2 })],
      2,
      new Set(["junior"]),
    );
    expect(allocOf(rows)).toEqual({ senior: 1, junior: 1 });
  });

  it("pays for a commander's copy out of the same supply as everything else", () => {
    // Holding commander copies OUTSIDE the supply allocated three copies against two owned —
    // three filled marks on a two-copy card.
    const rows = previewAllocation(
      [
        claimant({ deckId: "commander", since: AUG, quantity: 1, commanderCopies: 1 }),
        claimant({ deckId: "list", since: SEP, quantity: 2 }),
      ],
      2,
      new Set(["list"]),
    );
    expect(allocOf(rows)).toEqual({ commander: 1, list: 1 });
    expect(rows.reduce((n, r) => n + r.allocated, 0)).toBe(2);
  });

  it("gives a commander claim no place in the queue but its own", () => {
    // `allocate` promotes nothing: a commander claim is unreservable, and junior all the same.
    // Promoting it let a junior commander read `keeps it` mid-flight and drop back to nought.
    const rows = previewAllocation(
      [
        claimant({ deckId: "senior-list", since: AUG, quantity: 2 }),
        claimant({ deckId: "junior-commander", since: SEP, quantity: 1, commanderCopies: 1 }),
      ],
      2,
      new Set(["senior-list"]),
    );
    expect(allocOf(rows)).toEqual({ "senior-list": 2, "junior-commander": 0 });
  });

  it("never allocates more copies than are owned", () => {
    const rows = previewAllocation(
      [
        claimant({ deckId: "a", quantity: 2, since: AUG }),
        claimant({ deckId: "b", quantity: 2, since: SEP }),
      ],
      3,
      new Set(["b"]),
    );
    expect(rows.reduce((n, r) => n + r.allocated, 0)).toBe(3);
    expect(allocOf(rows)).toEqual({ a: 2, b: 1 });
  });

  it("never gives a deck more than it asked for", () => {
    const rows = previewAllocation([claimant({ deckId: "only", quantity: 1 })], 4, new Set(["only"]));
    expect(allocOf(rows)).toEqual({ only: 1 });
  });

  it("grants nothing to a deck that asks for nothing", () => {
    const rows = previewAllocation(
      [claimant({ deckId: "asks-none", quantity: 0 }), claimant({ deckId: "other", since: SEP })],
      1,
      new Set(["asks-none"]),
    );
    expect(allocOf(rows)).toEqual({ "asks-none": 0, other: 1 });
  });

  // SEVERAL PICKS (addendum, 2026-11-21): one copy to each picked deck, ahead of the queue, and
  // commit order fills the rest; the newest unpicked deck goes without.
  it("gives each picked deck one copy and fills the rest in commit order", () => {
    const rows = previewAllocation(
      [
        claimant({ deckId: "oldest", since: AUG }),
        claimant({ deckId: "middle", since: SEP }),
        claimant({ deckId: "newest", since: SEP + 1 }),
      ],
      2,
      new Set(["newest"]),
    );
    expect(allocOf(rows)).toEqual({ oldest: 1, middle: 0, newest: 1 });
  });

  it("lets picks beat commit order, so the oldest deck can be the one that buys it", () => {
    const rows = previewAllocation(
      [
        claimant({ deckId: "oldest", since: AUG }),
        claimant({ deckId: "middle", since: SEP }),
        claimant({ deckId: "newest", since: SEP + 1 }),
      ],
      2,
      new Set(["middle", "newest"]),
    );
    expect(allocOf(rows)).toEqual({ oldest: 0, middle: 1, newest: 1 });
  });

  it("pins a deck that already gets its copy without moving anyone", () => {
    const rows = previewAllocation(
      [
        claimant({ deckId: "oldest", since: AUG }),
        claimant({ deckId: "middle", since: SEP }),
        claimant({ deckId: "newest", since: SEP + 1 }),
      ],
      2,
      new Set(["oldest"]),
    );
    expect(allocOf(rows)).toEqual({ oldest: 1, middle: 1, newest: 0 });
  });
});
