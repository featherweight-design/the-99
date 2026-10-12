import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const DECK = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";
const SCRY = "33333333-3333-4333-8333-333333333333";
const ID = "44444444-4444-4444-8444-444444444444";

const state = vi.hoisted(() => ({
  printing: { setCode: "khm", collectorNumber: "31", finishes: ["nonfoil", "foil"] } as unknown,
  result: null as unknown,
  calls: [] as unknown[][],
  invalidated: 0,
  after: 0,
  where: null as unknown,
}));

vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async (condition: unknown) => {
      state.where = condition;
      return state.printing ? [state.printing] : [];
    } }) }),
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

import { markBought, markBoughtForDecks } from "./mark-bought-actions";

const press = (over: Record<string, unknown> = {}) =>
  markBought(DECK, CARD, { scryfallId: SCRY, finish: "foil", quantity: 2, expected: 1, id: ID, ...over });

const applied = (receipt: unknown) => ({
  status: "applied",
  entry: { id: ID, seq: 1, kind: "edit", rows: [], raised: 2, lowered: 0 },
  receipt,
});

beforeEach(() => {
  state.printing = { setCode: "khm", collectorNumber: "31", finishes: ["nonfoil", "foil"] };
  state.result = applied({ before: null, after: { owned: 3, claims: [] }, afterFromDecks: { [DECK]: { owned: 3, free: 0, soft: 0 } } });
  state.calls = [];
  state.invalidated = 0;
  state.after = 0;
  process.env.SHOPPING_MARK_BOUGHT_ENABLED = "true";
  process.env.COLLECTION_EDIT_ENABLED = "true";
  process.env.ALL_DECKS_CART_ENABLED = "true";
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
      { quantity: 0 }, { quantity: 21 }, { quantity: 1.5 }, { expected: -1 }, { expected: 2_147_483_647 },
      { finish: "shiny" }, { scryfallId: "x" }, { id: "nope" },
    ]) {
      await expect(press(over)).rejects.toThrow("bad mark-bought input");
    }
    expect(state.calls).toEqual([]);
  });

  it("refuses a card the deck does not hold, as the write's own in-transaction check answers", async () => {
    state.result = { status: "notInDeck" };
    expect(await press()).toEqual({ refused: "notInDeck" });
    expect(state.invalidated).toBe(0);
  });

  it("asks the catalog for the printing AS A PRINTING OF THIS CARD", async () => {
    await press();
    const { sql, params } = new PgDialect().sqlToQuery(state.where as SQL);
    // Both halves: the id alone would accept a Scryfall id that belongs to another card.
    expect(sql).toContain('"printings"."scryfall_id" = $1');
    expect(sql).toContain('"printings"."oracle_id" = $2');
    expect(params).toEqual([SCRY, CARD]);
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
    expect(opts).toEqual({
      id: ID, source: `shopping:${DECK}`, receipt: { oracleId: CARD, deckIds: [DECK] },
      requireMember: { deckIds: [DECK], oracleId: CARD },
    });
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

  it("takes a holding of any size a Postgres integer stores", async () => {
    expect(await press({ expected: 50_000 })).toEqual({ applied: { id: ID, receipt: { tookCopy: [], stillNeeds: 0 } } });
  });

  it("lowercases the ids it keys on", async () => {
    await markBought(DECK.toUpperCase(), CARD.toUpperCase(), { scryfallId: SCRY, finish: "foil", quantity: 1, expected: 0, id: ID });
    const [, change, opts] = state.calls[0] as [string, { rows: { oracleId: string }[] }, { source: string; receipt: { oracleId: string; deckIds: string[] } }];
    expect(opts.source).toBe(`shopping:${DECK}`);
    // `loadAvailability` keys its map on lowercase ids: an uppercase one would read no receipt.
    expect(opts.receipt).toEqual({ oracleId: CARD, deckIds: [DECK] });
    expect(change.rows[0].oracleId).toBe(CARD);
  });
});

describe("markBoughtForDecks", () => {
  const OTHER = "55555555-5555-4555-8555-555555555555";
  const cartPress = (over: Record<string, unknown> = {}) =>
    markBoughtForDecks(CARD, { deckIds: [DECK, OTHER], scryfallId: SCRY, finish: "foil", quantity: 2, expected: 1, id: ID, ...over });
  const cartApplied = () => applied({
    before: null,
    // One copy: seniority gives it to Gishath, and Kratos still needs one.
    after: { owned: 1, claims: [
      { id: DECK, name: "Gishath", quantity: 1, mature: true, since: 1 },
      { id: OTHER, name: "Kratos", quantity: 1, mature: true, since: 2 },
    ] },
    afterFromDecks: {},
  });

  it("refuses with the cart's switch off, writing nothing", async () => {
    process.env.ALL_DECKS_CART_ENABLED = "";
    expect(await cartPress()).toEqual({ refused: "off" });
    process.env.ALL_DECKS_CART_ENABLED = "true";
    process.env.SHOPPING_MARK_BOUGHT_ENABLED = "";
    expect(await cartPress()).toEqual({ refused: "off" });
    expect(state.calls).toEqual([]);
  });

  it("refuses malformed decks and a pick off the line", async () => {
    for (const over of [
      { deckIds: [] }, { deckIds: "x" }, { deckIds: [DECK, "nope"] },
      { deckIds: Array.from({ length: 501 }, () => DECK) },
      { pickDeckId: "nope" }, { pickDeckId: SCRY }, { quantity: 21 },
    ]) {
      await expect(cartPress(over)).rejects.toThrow("bad mark-bought input");
    }
    expect(state.calls).toEqual([]);
  });

  it("writes once for every deck, sourced shopping:cart, with each deck required and read", async () => {
    state.result = cartApplied();
    const out = await cartPress({ deckIds: [DECK.toUpperCase(), OTHER, DECK] });
    const [, , opts] = state.calls[0] as [string, unknown, Record<string, unknown>];
    expect(opts).toEqual({
      id: ID, source: `shopping:cart:${DECK},${OTHER}`,
      receipt: { oracleId: CARD, deckIds: [] },
      requireMember: { deckIds: [DECK, OTHER], oracleId: CARD },
    });
    expect(out).toEqual({ applied: { id: ID, receipt: {
      covered: [{ deckId: DECK, deckName: "Gishath" }],
      still: [{ deckId: OTHER, deckName: "Kratos", need: 1 }],
    } } });
    expect(state.invalidated).toBe(1);
  });

  it("sends the chooser's pick as the reservation to write with the purchase", async () => {
    state.result = cartApplied();
    await cartPress({ pickDeckId: OTHER.toUpperCase() });
    const [, , opts] = state.calls[0] as [string, unknown, Record<string, unknown>];
    expect(opts.assign).toEqual({ oracleId: CARD, deckId: OTHER });
  });

  it("names a refused pick and a deck that dropped the card", async () => {
    state.result = { status: "assignRefused", reason: "no-supply-left" };
    expect(await cartPress({ pickDeckId: DECK })).toEqual({ pickRefused: "no-supply-left" });
    state.result = { status: "notInDeck" };
    expect(await cartPress()).toEqual({ refused: "notInDeck" });
    expect(state.invalidated).toBe(0);
  });
});
