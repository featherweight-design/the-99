import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith, ENV_VIEW, ENV_VIEW as RESOLVED } from "@/test/env-view";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

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
  contested: null as unknown,
  contestedArgs: [] as unknown[],
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
vi.mock("../../lib/decks/availability-query", () => ({
  loadDeckBuyRows: async () => [
    { deckId: "11111111-1111-4111-8111-111111111111", oracleId: "22222222-2222-4222-8222-222222222222", quantity: 1 },
    { deckId: "55555555-5555-4555-8555-555555555555", oracleId: "22222222-2222-4222-8222-222222222222", quantity: 1 },
    { deckId: "55555555-5555-4555-8555-555555555555", oracleId: "another-card", quantity: 4 },
  ],
}));
vi.mock("../../lib/collection/write", () => ({
  applyCollectionChange: async (...args: unknown[]) => {
    state.calls.push(args);
    return state.result;
  },
}));

vi.mock("../../lib/collection/summary-read", () => ({
  buildContestedCard: (oracleId: string, _name: string, a: { owned: number }, frozen: unknown) => ({ oracleId, owned: a.owned, frozen }),
  loadContestedCard: async (...args: unknown[]) => {
    state.contestedArgs = args;
    return state.contested;
  },
}));

import { markBought, markBoughtForDecks, readCartChooser } from "./mark-bought-actions";

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
  delete process.env.ADDED_COPY_ENABLED;
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
    const { env, ...rest } = opts;
    expect(rest).toEqual({
      id: ID, source: `shopping:${DECK}`, receipt: { oracleId: CARD, deckIds: [DECK] },
      requireMember: { deckIds: [DECK], oracleId: CARD },
    });
    expect(env === RESOLVED).toBe(true);
    expect(out).toEqual({ applied: { id: ID, receipt: { tookCopy: [], stillNeeds: 0 } } });
  });

  it("adds where the copy went and the chooser Change opens, from the write's own snapshot, only with the switch on", async () => {
    const claim = { id: DECK, name: "HD - Brago", quantity: 1, mature: true, since: 1 };
    state.result = applied({
      before: { owned: 1, claims: [claim] },
      after: { owned: 3, claims: [claim] },
      afterFromDecks: { [DECK]: { owned: 3, free: 0, soft: 0 } },
    });
    expect(await press()).toEqual({ applied: { id: ID, receipt: { tookCopy: [], stillNeeds: 0 } } });
    process.env.ADDED_COPY_ENABLED = "true";
    expect(await press()).toEqual({ applied: { id: ID, receipt: {
      tookCopy: [],
      stillNeeds: 0,
      went: { held: [], soft: [], unplaced: 2 },
      chooser: { oracleId: CARD, owned: 3, frozen: { arrived: 2, ownedBefore: 1, fromImport: true } },
    } } });
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
    // The roll-up, read inside the write: it still bills Kratos one, and bills Gishath nothing.
    owes: { [OTHER]: 1 },
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
    const { env, ...rest } = opts;
    expect(rest).toEqual({
      id: ID, source: `shopping:cart:${DECK},${OTHER}`,
      receipt: { oracleId: CARD, deckIds: [], owesFor: [DECK, OTHER] },
      requireMember: { deckIds: [DECK, OTHER], oracleId: CARD },
    });
    expect(env === RESOLVED).toBe(true);
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

  // The entry's own record of the pick (`HistoryRow.placed`), stamped only when the press wrote it.
  const withPlaced = (status: "applied" | "alreadyApplied", placed?: object) => {
    const base = cartApplied();
    const row = { oracleId: CARD, setCode: "khm", collectorNumber: "31", finish: "foil", name: "c", before: null, after: null };
    return { ...base, status, entry: { ...base.entry, rows: [placed ? { ...row, placed } : row] } };
  };

  it("says whether the press created the pick's reservation, so only a created one is undone", async () => {
    state.result = withPlaced("applied", { deckId: OTHER });
    expect(await cartPress({ pickDeckId: OTHER })).toMatchObject({ applied: { pickCreated: true } });
    state.result = withPlaced("applied");
    expect(await cartPress({ pickDeckId: OTHER })).toMatchObject({ applied: { pickCreated: false } });
    // No pick, no field: the shipped answer is unchanged.
    state.result = cartApplied();
    expect("pickCreated" in ((await cartPress()) as { applied: object }).applied).toBe(false);
  });

  it("reports the reservation a move displaced, for the undo to put back", async () => {
    state.result = withPlaced("applied", { deckId: OTHER, displaced: { deckId: DECK, copies: 1, createdAt: "2026-10-01 10:00:00.123456" } });
    const out = await cartPress({ pickDeckId: OTHER }) as { applied: Record<string, unknown> };
    expect(out.applied.pickCreated).toBe(true);
    // The instant stays on the server: the undo restores from the entry, not from the client.
    expect(out.applied.pickDisplaced).toEqual({ deckId: DECK, copies: 1 });
  });

  it("a retry after a lost answer reports the pick as the first request did", async () => {
    state.result = withPlaced("alreadyApplied", { deckId: OTHER, displaced: { deckId: DECK, copies: 1, createdAt: "x" } });
    expect(await cartPress({ pickDeckId: OTHER })).toMatchObject({
      applied: { pickCreated: true, pickDisplaced: { deckId: DECK, copies: 1 } },
    });
    state.result = withPlaced("alreadyApplied");
    expect(await cartPress({ pickDeckId: OTHER })).toMatchObject({ applied: { pickCreated: false } });
  });

  it("answers a stale press with what the line's decks are billed now, from the roll-up", async () => {
    const current = [{ oracleId: CARD, setCode: "khm", collectorNumber: "31", finish: "foil" as const, quantity: 2 }];
    state.result = { status: "stale", current };
    expect(await cartPress()).toEqual({ stale: current, need: 2 });
  });

  it("names a refused pick and a deck that dropped the card", async () => {
    state.result = { status: "assignRefused", reason: "no-supply-left" };
    expect(await cartPress({ pickDeckId: DECK })).toEqual({ pickRefused: "no-supply-left" });
    state.result = { status: "notInDeck" };
    expect(await cartPress()).toEqual({ refused: "notInDeck" });
    expect(state.invalidated).toBe(0);
  });
});

describe("readCartChooser", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "55555555-5555-4555-8555-555555555555";
  const C = "66666666-6666-4666-8666-666666666666";
  const claimant = (deckId: string) => ({ deckId, deckName: deckId, quantity: 1, commanderCopies: 0, granted: 0, since: null, versionNumber: null, allocated: 0 });

  it("narrows the claimants to the line's decks, in the model's queue order", async () => {
    state.contested = { oracleId: CARD, cardName: "Sol Ring", arrived: 0, ownedBefore: 0, fromImport: false, owned: 17, claimants: [claimant(C), claimant(B), claimant(A)] };
    const card = await readCartChooser(CARD.toUpperCase(), [A.toUpperCase(), B]);
    const [oracleId, user, opts] = state.contestedArgs as [string, string, { unownedAsZero?: boolean; env?: unknown }];
    expect([oracleId, user, opts.unownedAsZero]).toEqual([CARD, "user_1", true]);
    expect(opts.env === RESOLVED).toBe(true);
    expect(card?.claimants.map((c) => c.deckId)).toEqual([B, A]);
  });

  it("answers null with a switch off, or when none of the line's decks claims the card", async () => {
    state.contested = { oracleId: CARD, cardName: "Sol Ring", arrived: 0, ownedBefore: 0, fromImport: false, owned: 17, claimants: [claimant(C)] };
    expect(await readCartChooser(CARD, [A])).toBeNull();
    process.env.ALL_DECKS_CART_ENABLED = "";
    state.contested = { oracleId: CARD, cardName: "Sol Ring", arrived: 0, ownedBefore: 0, fromImport: false, owned: 17, claimants: [claimant(A)] };
    expect(await readCartChooser(CARD, [A])).toBeNull();
  });

  it("answers null when the claim model misses one of the line's decks, so the list stays whole", async () => {
    state.contested = { oracleId: CARD, cardName: "Sol Ring", arrived: 0, ownedBefore: 0, fromImport: false, owned: 17, claimants: [claimant(A)] };
    expect(await readCartChooser(CARD, [A, B])).toBeNull();
  });

  it("refuses malformed input", async () => {
    for (const bad of [[], ["nope"], "x", [A, 3]]) {
      await expect(readCartChooser(CARD, bad)).rejects.toThrow();
    }
    await expect(readCartChooser("nope", [A])).rejects.toThrow();
  });
});

// Admin PR 6f-2: the purchase's claim reads and the cart chooser's read take the reader's env. Opposite to
// the environment on both claim-model switches, so a dropped argument would read the other way.
describe("the reader's env", () => {
  it("reaches both writes and the chooser's read, by identity", async () => {
    const { requestSwitchEnv } = await import("../../lib/switches/request");
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    const env = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
    vi.mocked(requestSwitchEnv).mockResolvedValue(env);
    try {
      await press();
      await markBoughtForDecks(CARD, { deckIds: [DECK], scryfallId: SCRY, finish: "foil", quantity: 2, expected: 1, id: ID });
      expect(state.calls).toHaveLength(2);
      for (const call of state.calls) expect((call[2] as { env?: unknown }).env === env).toBe(true);
      await readCartChooser(CARD, [DECK]);
      expect((state.contestedArgs as unknown[] as [string, string, { env?: unknown }])[2].env === env).toBe(true);
    } finally {
      vi.mocked(requestSwitchEnv).mockResolvedValue(ENV_VIEW);
      vi.unstubAllEnvs();
    }
  });
});
