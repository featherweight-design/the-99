import { beforeEach, describe, expect, it, vi } from "vitest";

const DECK = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";
const SCRY = "33333333-3333-4333-8333-333333333333";
const ID = "44444444-4444-4444-8444-444444444444";

const state = vi.hoisted(() => ({
  member: true,
  printing: { setCode: "khm", collectorNumber: "31", finishes: ["nonfoil", "foil"] } as unknown,
  result: null as unknown,
  calls: [] as unknown[][],
  invalidated: 0,
  after: 0,
}));

vi.mock("../../db", () => ({
  db: {
    execute: async () => ({ rows: [{ held: state.member }] }),
    select: () => ({ from: () => ({ where: async () => (state.printing ? [state.printing] : []) }) }),
  },
}));
vi.mock("next/server", () => ({ after: () => { state.after += 1; } }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/decks/read", () => ({ requireDeck: async () => ({ id: DECK }) }));
vi.mock("../../lib/collection/invalidate", () => ({ invalidateCollectionReaders: () => { state.invalidated += 1; } }));
vi.mock("../../lib/recs/warm", () => ({ warmCommanderScores: async () => {} }));
vi.mock("../../lib/collection/write", () => ({
  applyCollectionChange: async (...args: unknown[]) => {
    state.calls.push(args);
    return state.result;
  },
}));

import { markBought } from "./mark-bought-actions";

const press = (over: Record<string, unknown> = {}) =>
  markBought(DECK, CARD, { scryfallId: SCRY, finish: "foil", quantity: 2, expected: 1, id: ID, ...over });

const applied = (receipt: unknown) => ({
  status: "applied",
  entry: { id: ID, seq: 1, kind: "edit", rows: [], raised: 2, lowered: 0 },
  receipt,
});

beforeEach(() => {
  state.member = true;
  state.printing = { setCode: "khm", collectorNumber: "31", finishes: ["nonfoil", "foil"] };
  state.result = applied({ before: null, after: { owned: 3, claims: [] }, afterFromDeck: { owned: 3, free: 0, soft: 0 } });
  state.calls = [];
  state.invalidated = 0;
  state.after = 0;
  process.env.SHOPPING_MARK_BOUGHT_ENABLED = "true";
  process.env.COLLECTION_EDIT_ENABLED = "true";
});

describe("markBought", () => {
  it("refuses with either switch off, writing nothing", async () => {
    process.env.COLLECTION_EDIT_ENABLED = "";
    expect(await press()).toEqual({ refused: "off" });
    process.env.COLLECTION_EDIT_ENABLED = "true";
    process.env.SHOPPING_MARK_BOUGHT_ENABLED = "";
    expect(await press()).toEqual({ refused: "off" });
    expect(state.calls).toEqual([]);
  });

  it("refuses malformed input", async () => {
    for (const over of [
      { quantity: 0 }, { quantity: 21 }, { quantity: 1.5 }, { expected: -1 },
      { finish: "shiny" }, { scryfallId: "x" }, { id: "nope" },
    ]) {
      await expect(press(over)).rejects.toThrow("bad mark-bought input");
    }
    expect(state.calls).toEqual([]);
  });

  it("refuses a card the deck does not hold", async () => {
    state.member = false;
    expect(await press()).toEqual({ refused: "notInDeck" });
    expect(state.calls).toEqual([]);
  });

  it("refuses a printing of another card, or a finish the printing lacks", async () => {
    state.printing = null;
    expect(await press()).toEqual({ refused: "notAPrinting" });
    state.printing = { setCode: "khm", collectorNumber: "31", finishes: ["nonfoil"] };
    expect(await press()).toEqual({ refused: "notAPrinting" });
    expect(state.calls).toEqual([]);
  });

  it("writes the ABSOLUTE count from the catalog's printing, sourced to the deck, with the receipt asked for", async () => {
    const out = await press();
    const [user, change, opts] = state.calls[0] as [string, { rows: Record<string, unknown>[] }, Record<string, unknown>];
    expect(user).toBe("user_1");
    expect(change.rows).toEqual([{
      oracleId: CARD, setCode: "khm", collectorNumber: "31", finish: "foil",
      quantity: 3, expected: 1, scryfallId: SCRY, condition: null,
    }]);
    expect(opts).toEqual({ id: ID, source: `shopping:${DECK}`, receipt: { oracleId: CARD, deckId: DECK } });
    expect(out).toEqual({ applied: { id: ID, receipt: { tookCopy: [], stillNeeds: 0 } } });
  });

  it("invalidates before it answers, and warms after", async () => {
    await press();
    expect(state.invalidated).toBe(1);
    expect(state.after).toBe(1);
  });

  it("answers a retry with no receipt, since its snapshots were the first request's", async () => {
    state.result = { status: "alreadyApplied", entry: { id: ID, seq: 1, kind: "edit", rows: [], raised: 2, lowered: 0 } };
    expect(await press()).toEqual({ applied: { id: ID, receipt: null } });
    expect(state.invalidated).toBe(1);
  });

  it("passes a stale holding back", async () => {
    state.result = { status: "stale", current: [{ oracleId: CARD, setCode: "khm", collectorNumber: "31", finish: "foil", quantity: 4 }] };
    expect(await press()).toEqual({ stale: [{ oracleId: CARD, setCode: "khm", collectorNumber: "31", finish: "foil", quantity: 4 }] });
    expect(state.invalidated).toBe(0);
  });

  it("lowercases the ids it keys on", async () => {
    await markBought(DECK.toUpperCase(), CARD.toUpperCase(), { scryfallId: SCRY, finish: "foil", quantity: 1, expected: 0, id: ID });
    const [, change, opts] = state.calls[0] as [string, { rows: { oracleId: string }[] }, { source: string; receipt: { oracleId: string; deckId: string } }];
    expect(opts.source).toBe(`shopping:${DECK}`);
    // `loadAvailability` keys its map on lowercase ids: an uppercase one would read no receipt.
    expect(opts.receipt).toEqual({ oracleId: CARD, deckId: DECK });
    expect(change.rows[0].oracleId).toBe(CARD);
  });
});
