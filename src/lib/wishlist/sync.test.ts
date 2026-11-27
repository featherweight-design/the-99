import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
const { desiredLines, isDue, planIsEmpty, planWishlistSync, MAX_LINE_QUANTITY, QUIET_BATCH } = await import("./sync");

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const D1 = "10000000-0000-4000-8000-000000000001";
const D2 = "10000000-0000-4000-8000-000000000002";
const none = { offDecks: new Set<string>(), skipped: new Set<string>(), unfinished: new Set<string>(), held: new Map<string, number>() };

describe("desiredLines", () => {
  it("is what the card holds plus every deck's deficit, one line per card", () => {
    const lines = desiredLines(
      [{ deckId: D1, oracleId: A, quantity: 2 }, { deckId: D2, oracleId: A, quantity: 1 }],
      { ...none, held: new Map([[A, 1]]), unfinished: new Set([D2]) },
    );
    expect(lines).toEqual([{
      oracleId: A, held: 1, quantity: 4,
      decks: [{ deckId: D1, quantity: 2, unfinished: false }, { deckId: D2, quantity: 1, unfinished: true }],
    }]);
  });

  it("leaves out a deck kept off the wishlist and a card the player took off", () => {
    const lines = desiredLines(
      [{ deckId: D1, oracleId: A, quantity: 1 }, { deckId: D2, oracleId: A, quantity: 1 }, { deckId: D1, oracleId: B, quantity: 1 }],
      { ...none, offDecks: new Set([D2]), skipped: new Set([B]) },
    );
    expect(lines.map((l) => [l.oracleId, l.quantity, l.decks.map((d) => d.deckId)])).toEqual([[A, 1, [D1]]]);
  });

  it("caps the want at 99, and draws no line for a card already held at the cap", () => {
    expect(desiredLines([{ deckId: D1, oracleId: A, quantity: 5 }], { ...none, held: new Map([[A, 97]]) })[0]?.quantity).toBe(MAX_LINE_QUANTITY);
    expect(desiredLines([{ deckId: D1, oracleId: A, quantity: 5 }], { ...none, held: new Map([[A, 99]]) })).toEqual([]);
  });

  it("ignores a row with nothing to buy", () => {
    expect(desiredLines([{ deckId: D1, oracleId: A, quantity: 0 }], none)).toEqual([]);
  });
});

describe("planWishlistSync", () => {
  const line = (oracleId: string, quantity: number, decks: { deckId: string; quantity: number; unfinished?: boolean }[], held = 0) =>
    ({ oracleId, quantity, held, decks: decks.map((d) => ({ unfinished: false, ...d })) });

  it("writes nothing when nothing changed", () => {
    const now = [line(A, 2, [{ deckId: D1, quantity: 2 }])];
    expect(planIsEmpty(planWishlistSync(now, now, { firstPass: false }))).toBe(true);
  });

  it("inserts a new line with its decks, deletes a line no deck needs, updates only what differs", () => {
    const plan = planWishlistSync(
      [line(A, 3, [{ deckId: D1, quantity: 3 }]), line(B, 1, [{ deckId: D2, quantity: 1 }])],
      [line(A, 2, [{ deckId: D1, quantity: 2 }]), line("c", 1, [{ deckId: D1, quantity: 1 }])],
      { firstPass: false },
    );
    expect(plan.insertLines.map((l) => [l.oracleId, l.quiet])).toEqual([[B, false]]);
    expect(plan.insertDecks).toEqual([{ oracleId: B, deckId: D2, quantity: 1, unfinished: false }]);
    expect(plan.updateLines).toEqual([{ oracleId: A, quantity: 3, held: 0 }]);
    expect(plan.updateDecks).toEqual([{ oracleId: A, deckId: D1, quantity: 3, unfinished: false }]);
    expect(plan.deleteLines).toEqual(["c"]);
    expect(plan.deleteDecks).toEqual([]);
  });

  it("rewrites a deck row's unfinished when the deck's status changes, and nothing else", () => {
    const plan = planWishlistSync(
      [line(A, 1, [{ deckId: D1, quantity: 1, unfinished: false }])],
      [line(A, 1, [{ deckId: D1, quantity: 1, unfinished: true }])],
      { firstPass: false },
    );
    expect(plan.updateDecks).toEqual([{ oracleId: A, deckId: D1, quantity: 1, unfinished: false }]);
    expect(plan.updateLines).toEqual([]);
    expect(plan.insertLines).toEqual([]);
  });

  it("updates a line whose held changed though its want did not", () => {
    const plan = planWishlistSync([line(A, 2, [{ deckId: D1, quantity: 1 }], 1)], [line(A, 2, [{ deckId: D1, quantity: 1 }], 0)], { firstPass: false });
    expect(plan.updateLines).toEqual([{ oracleId: A, quantity: 2, held: 1 }]);
  });

  it("drops a deck that no longer needs the card from a line that stays", () => {
    const plan = planWishlistSync(
      [line(A, 1, [{ deckId: D1, quantity: 1 }])],
      [line(A, 2, [{ deckId: D1, quantity: 1 }, { deckId: D2, quantity: 1 }])],
      { firstPass: false },
    );
    expect(plan.deleteDecks).toEqual([{ oracleId: A, deckId: D2 }]);
  });

  it("marks every line of a first pass quiet, and a pass adding more than the batch", () => {
    expect(planWishlistSync([line(A, 1, [{ deckId: D1, quantity: 1 }])], [], { firstPass: true }).insertLines[0]?.quiet).toBe(true);
    const many = Array.from({ length: QUIET_BATCH + 1 }, (_, i) => line(`card-${i}`, 1, [{ deckId: D1, quantity: 1 }]));
    expect(planWishlistSync(many, [], { firstPass: false }).insertLines.every((l) => l.quiet)).toBe(true);
    const few = many.slice(0, QUIET_BATCH);
    expect(planWishlistSync(few, [], { firstPass: false }).insertLines.some((l) => l.quiet)).toBe(false);
  });
});

describe("isDue", () => {
  it("is due with the switch on and no ledger, or a stamp past it; never with the switch off", () => {
    expect(isDue({ on: true, stamp: 0, syncedStamp: null })).toBe(true);
    expect(isDue({ on: true, stamp: 5, syncedStamp: 4 })).toBe(true);
    expect(isDue({ on: true, stamp: 5, syncedStamp: 5 })).toBe(false);
    expect(isDue({ on: false, stamp: 9, syncedStamp: null })).toBe(false);
  });
});
