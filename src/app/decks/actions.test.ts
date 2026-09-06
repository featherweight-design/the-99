import { beforeEach, describe, expect, it, vi } from "vitest";

// The action module imports the db client, which throws at module init without a live URL.
const stub = vi.hoisted(() => {
  const nameOf = (table: unknown): string =>
    (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];

  const state = {
    // Card rows returned when actions query `cards` table
    cards: [] as Record<string, unknown>[],
    // Rows returned when querying `collection_items` (pool/quantity queries)
    collectionItems: [] as Record<string, unknown>[],
    // Rows returned when querying `decks` table (used by requireDeck)
    decks: [] as Record<string, unknown>[],
    // Insert calls tracked as { table, values, returning? }
    insertCalls: [] as { table: string; values: unknown; returning: unknown[] | null }[],
    // Tracks whether the transaction was called and whether it should reject
    transactionError: null as Error | null,
    // The rows already in the deck, returned by the in-transaction read
    deckRows: [] as { oracleId: string; quantity: number }[],
    // Whether getEdhrecData should reject
    edhrecError: null as Error | null,
    // redirect target captured
    redirectTarget: null as string | null,
    // Rows returned when querying `deck_games` (used by deleteGame's pairing check)
    deckGames: [] as { id: string; deckId: string }[],
    // Delete calls tracked as { table, id } — the id lifted out of the eq() condition
    deleteCalls: [] as { table: string; id: string | null }[],
    // Every path passed to revalidatePath, in order
    revalidated: [] as string[],
  };

  // Lift the bound value out of a drizzle `eq(column, value)` condition so a
  // delete can be asserted on what it targeted, not merely that it happened.
  const paramValue = (condition: unknown): string | null => {
    const chunks = (condition as { queryChunks?: unknown[] } | undefined)?.queryChunks ?? [];
    for (const chunk of chunks) {
      const value = (chunk as { value?: unknown } | undefined)?.value;
      if (typeof value === "string") return value;
    }
    return null;
  };

  // A per-test fake for db.select chains
  type SelectBuilder = {
    from: (table: unknown) => SelectFromBuilder;
  };
  type SelectFromBuilder = {
    from?: unknown;
    where: (condition?: unknown) => Promise<Record<string, unknown>[]>;
    innerJoin: (table: unknown, condition: unknown) => SelectFromBuilder;
    orderBy: (...args: unknown[]) => SelectFromBuilder;
    groupBy: (...args: unknown[]) => Promise<Record<string, unknown>[]>;
  };

  function makeSelectBuilder(): SelectBuilder {
    return {
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const builder: SelectFromBuilder = {
          where: async () => {
            if (tableName === "cards") return state.cards;
            if (tableName === "decks") return state.decks;
            if (tableName === "deck_games") return state.deckGames;
            return state.collectionItems;
          },
          innerJoin: () => {
            // After innerJoin, the result is collection_items + cards join
            return {
              where: () => ({
                orderBy: () => ({
                  then: (resolve: (v: unknown) => unknown) =>
                    Promise.resolve(state.collectionItems).then(resolve),
                }),
                // Mirrors the real pool query: one row per oracle id, carrying
                // the card columns plus `ownedQuantity` summed across printings.
                groupBy: async () => {
                  const agg = new Map<string, Record<string, unknown>>();
                  for (const item of state.collectionItems) {
                    const row = item as Record<string, unknown>;
                    const id = row.oracleId as string;
                    const q = (row.quantity as number | undefined) ?? 1;
                    const seen = agg.get(id);
                    if (seen) {
                      seen.ownedQuantity = (seen.ownedQuantity as number) + q;
                    } else {
                      agg.set(id, { ...row, ownedQuantity: q });
                    }
                  }
                  return Array.from(agg.values());
                },
              }),
            } as unknown as SelectFromBuilder;
          },
          orderBy: () => builder,
          groupBy: async () => state.collectionItems,
        };
        return builder;
      },
    };
  }

  // insert builder
  function makeInsertBuilder(table: unknown) {
    const tableName = nameOf(table);
    return {
      values: (values: unknown) => {
        const returning: unknown[] = [];
        if (tableName === "decks") {
          returning.push({ id: "deck-new-uuid" });
        }
        if (tableName === "deck_games") {
          returning.push({ id: "game-new-uuid" });
        }
        state.insertCalls.push({ table: tableName, values, returning: returning.length ? returning : null });
        return {
          returning: async () => returning,
          onConflictDoUpdate: async () => {},
          onConflictDoNothing: async () => {},
        };
      },
    };
  }

  const tx = {
    insert: (table: unknown) => makeInsertBuilder(table),
    execute: async () => {},
    select: () => ({
      from: () => ({ where: async () => state.deckRows }),
    }),
  };

  const db = {
    select: () => makeSelectBuilder(),
    selectDistinctOn: () => makeSelectBuilder(),
    insert: (table: unknown) => makeInsertBuilder(table),
    delete: (table: unknown) => ({
      where: async (condition: unknown) => {
        state.deleteCalls.push({ table: nameOf(table), id: paramValue(condition) });
      },
    }),
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      if (state.transactionError) throw state.transactionError;
      return fn(tx);
    },
  };

  return { db, state };
});

vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => { stub.state.revalidated.push(path); },
}));
vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    stub.state.redirectTarget = target;
    // redirect() in Next.js throws a special error — simulate that so
    // the calling code sees it propagate past the try/catch properly.
    // We model it as a special sentinel that should never be caught.
    const err = new Error(`NEXT_REDIRECT:${target}`);
    (err as unknown as Record<string, unknown>)["__nextRedirect"] = true;
    throw err;
  },
}));

// Mock EDHREC client
vi.mock("../../lib/edhrec/client", () => ({
  getEdhrecData: async () => {
    if (stub.state.edhrecError) throw stub.state.edhrecError;
    return { data: null, unreachable: false };
  },
}));

// Mock synergy-read so fillLastSlots tests don't need live DB or EDHREC data
vi.mock("../commanders/[slug]/synergy-read", () => ({
  readSynergyCards: async () => [],
}));

import { createDeck, deleteGame, fillLastSlotsOwned, fillLastSlotsUnowned, logGame, restoreAutoCards } from "./actions";

// IDs used across tests
const COMMANDER_ORACLE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

/** A minimal legal commander card row */
function commanderCard(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    oracleId: COMMANDER_ORACLE,
    name: "Atraxa, Praetors' Voice",
    typeLine: "Legendary Creature — Phyrexian Angel Horror",
    oracleText: "Flying, vigilance, deathtouch, lifelink",
    keywords: ["Flying", "Vigilance", "Deathtouch", "Lifelink"],
    colorIdentity: ["W", "U", "B", "G"],
    commanderLegal: true,
    imageUri: null,
    manaCost: "{G}{W}{U}{B}",
    cmc: 4,
    ...overrides,
  };
}

/** A ramp artifact card */
function rampCard(n: number): Record<string, unknown> {
  return {
    oracleId: `ramp-${n.toString().padStart(8, "0")}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
    name: `Ramp Artifact ${n}`,
    typeLine: "Artifact",
    oracleText: "Add {G}.",
    keywords: [],
    colorIdentity: [],
    commanderLegal: true,
    quantity: 1,
  };
}

/** A basic Forest card */
function forestCard(n: number, quantity = 1): Record<string, unknown> {
  return {
    oracleId: `forest-${n.toString().padStart(7, "0")}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
    name: "Forest",
    typeLine: "Basic Land — Forest",
    oracleText: null,
    keywords: [],
    colorIdentity: ["G"],
    commanderLegal: true,
    quantity,
  };
}

/** Helper: run createDeck and capture the redirect target; swallow the redirect throw */
async function runCreate(commanderOracleId = COMMANDER_ORACLE, name = "My Deck") {
  try {
    await createDeck(commanderOracleId, name);
  } catch (err) {
    const e = err as Error & { __nextRedirect?: boolean };
    if (!e.__nextRedirect) throw err;
    // redirect was thrown — that's expected; state.redirectTarget is already set
  }
}

beforeEach(() => {
  stub.state.cards.length = 0;
  stub.state.collectionItems.length = 0;
  stub.state.decks.length = 0;
  stub.state.insertCalls.length = 0;
  stub.state.transactionError = null;
  stub.state.deckRows.length = 0;
  stub.state.edhrecError = null;
  stub.state.redirectTarget = null;
});

describe("createDeck — filled baseline", () => {
  it("writes the filled baseline and marks every row auto", async () => {
    // Commander card query
    stub.state.cards.push(commanderCard());
    // Pool: ten ramp artifacts and forty Forests
    const pool: Record<string, unknown>[] = [
      ...Array.from({ length: 10 }, (_, i) => rampCard(i)),
      ...Array.from({ length: 40 }, (_, i) => forestCard(i, 4)),
    ];
    stub.state.collectionItems.push(...pool);

    await runCreate();

    const decksInsert = stub.state.insertCalls.find((c) => c.table === "decks");
    expect(decksInsert).toBeDefined();
    expect(decksInsert!.values).toMatchObject({ filled: true });

    const deckCardsInsert = stub.state.insertCalls.find((c) => c.table === "deck_cards");
    expect(deckCardsInsert).toBeDefined();
    const rows = deckCardsInsert!.values as Array<Record<string, unknown>>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.auto).toBe(true);
    }

    // Basic lands owned in multiples must stack to the actual owned quantity,
    // not the ?? 1 fallback.  The pool has 40 Forests each owned in quantity 4;
    // planFill stacks them up to LAND_TARGET (37), so forest rows should sum to
    // 37 and the early ones should carry quantity 4 (not 1).
    const forestRows = rows.filter((r) =>
      typeof r.oracleId === "string" && r.oracleId.startsWith("forest-"),
    );
    expect(forestRows.length).toBeGreaterThan(0);
    const forestTotal = forestRows.reduce((n, r) => n + (r.quantity as number), 0);
    expect(forestTotal).toBe(37);
    // At least the first several forests should carry quantity 4 (not 1).
    expect(forestRows.some((r) => r.quantity === 4)).toBe(true);
  });

  it("still creates the deck when the transaction throws", async () => {
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));
    stub.state.transactionError = new Error("transaction failed");

    await runCreate();

    // A fallback deck row must have been inserted with filled: false
    const decksInserts = stub.state.insertCalls.filter((c) => c.table === "decks");
    // The transaction threw, so the fallback insert is the only decks insert
    expect(decksInserts.length).toBeGreaterThanOrEqual(1);
    const fallback = decksInserts[decksInserts.length - 1];
    expect(fallback.values).toMatchObject({ filled: false });

    // No deck_cards rows should have been inserted (transaction rolled back)
    const deckCardsInserts = stub.state.insertCalls.filter((c) => c.table === "deck_cards");
    expect(deckCardsInserts.length).toBe(0);

    // Redirect must still have fired
    expect(stub.state.redirectTarget).toBe("/decks/deck-new-uuid");
  });

  it("still creates the deck when EDHREC is unreachable", async () => {
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));
    stub.state.edhrecError = new Error("network timeout");

    await runCreate();

    // Fallback deck with filled: false
    const decksInserts = stub.state.insertCalls.filter((c) => c.table === "decks");
    expect(decksInserts.length).toBeGreaterThanOrEqual(1);
    const fallback = decksInserts[decksInserts.length - 1];
    expect(fallback.values).toMatchObject({ filled: false });

    // Redirect still fired
    expect(stub.state.redirectTarget).toBe("/decks/deck-new-uuid");
  });

  it("marks an empty collection filled, not failed", async () => {
    stub.state.cards.push(commanderCard());
    // Empty collection — no cards in pool, no quantities
    // collectionItems stays empty

    await runCreate();

    // The fill ran and found nothing — this is NOT a failure
    const decksInsert = stub.state.insertCalls.find((c) => c.table === "decks");
    expect(decksInsert).toBeDefined();
    expect(decksInsert!.values).toMatchObject({ filled: true });

    // No deck_cards insert (nothing to insert)
    const deckCardsInserts = stub.state.insertCalls.filter((c) => c.table === "deck_cards");
    expect(deckCardsInserts.length).toBe(0);

    expect(stub.state.redirectTarget).toBe("/decks/deck-new-uuid");
  });

  it("refuses a card that cannot lead a deck", async () => {
    // Non-commander-legal card
    stub.state.cards.push(commanderCard({ commanderLegal: false }));

    await expect(runCreate()).rejects.toThrow("card is not a legal commander");

    // No deck created
    const decksInserts = stub.state.insertCalls.filter((c) => c.table === "decks");
    expect(decksInserts.length).toBe(0);
    expect(stub.state.redirectTarget).toBeNull();
  });
});

describe("restoreAutoCards — the rows come from the client", () => {
  const DECK = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const CARD_A = "11111111-1111-1111-1111-111111111111";
  const CARD_B = "22222222-2222-2222-2222-222222222222";
  const CARD_OFF = "33333333-3333-3333-3333-333333333333";
  const CARD_BANNED = "44444444-4444-4444-4444-444444444444";
  const CARD_ABSENT = "55555555-5555-5555-5555-555555555555";
  const CMDR = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  /** requireDeck reads the `decks` table; push a row with the caller's userId
      to make the deck resolve as owned. The commander lookup takes the first
      `cards` row; the candidate lookup reads them all. */
  function ownDeck() {
    stub.state.decks.push({ id: DECK, userId: "user_1", commanderOracleId: CMDR });
    stub.state.cards.push(
      { oracleId: CMDR, commanderLegal: true, colorIdentity: ["B", "R", "G"] },
      { oracleId: CARD_A, commanderLegal: true, colorIdentity: [] },
      { oracleId: CARD_B, commanderLegal: true, colorIdentity: ["G"] },
      { oracleId: CARD_OFF, commanderLegal: true, colorIdentity: ["U"] },
      { oracleId: CARD_BANNED, commanderLegal: false, colorIdentity: [] },
    );
  }

  function restoredRows() {
    const call = stub.state.insertCalls.find((c) => c.table === "deck_cards");
    return (call?.values ?? []) as Array<Record<string, unknown>>;
  }

  it("restores the swept rows as auto", async () => {
    ownDeck();
    await restoreAutoCards(DECK, [{ oracleId: CARD_A, quantity: 4 }]);
    expect(restoredRows()).toEqual([
      { deckId: DECK, oracleId: CARD_A, quantity: 4, auto: true },
    ]);
  });

  it("rejects an oracle id that is not a uuid", async () => {
    ownDeck();
    await expect(
      restoreAutoCards(DECK, [{ oracleId: "'; drop table deck_cards; --", quantity: 1 }]),
    ).rejects.toThrow("invalid oracle id");
    expect(restoredRows()).toEqual([]);
  });

  it.each([0, -1, 100, 1.5, Number.NaN])("rejects the quantity %s", async (quantity) => {
    ownDeck();
    await expect(
      restoreAutoCards(DECK, [{ oracleId: CARD_A, quantity }]),
    ).rejects.toThrow("invalid quantity");
    expect(restoredRows()).toEqual([]);
  });

  // Duplicate ids inside one VALUES list conflict with each other, which
  // onConflictDoNothing does not cover — Postgres rejects the statement whole.
  it("collapses a repeated oracle id to one row", async () => {
    ownDeck();
    await restoreAutoCards(DECK, [
      { oracleId: CARD_A, quantity: 1 },
      { oracleId: CARD_A, quantity: 2 },
      { oracleId: CARD_B, quantity: 1 },
    ]);
    expect(restoredRows().map((r) => r.oracleId)).toEqual([CARD_A, CARD_B]);
  });

  // Undo puts back what the player had. Refusing it because the result is over
  // would leave them with neither the cards nor the deletion they undid.
  it("restores past 99 — the count says Over, the restore is not refused", async () => {
    ownDeck();
    stub.state.deckRows.push({ oracleId: CARD_B, quantity: 97 });
    const restored = await restoreAutoCards(DECK, [{ oracleId: CARD_A, quantity: 3 }]);
    expect(restored).toBe(3);
    expect(restoredRows().map((r) => r.oracleId)).toContain(CARD_A);
  });

  // A card re-added by hand before Undo is skipped by the conflict clause, so
  // counting it would overstate what this restore actually put back.
  it("ignores a row already in the deck when counting what it restored", async () => {
    ownDeck();
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 99 });
    await restoreAutoCards(DECK, [{ oracleId: CARD_A, quantity: 1 }]);
    expect(restoredRows().map((r) => r.oracleId)).toEqual([CARD_A]);
  });

  it("writes nothing when the receipt is empty", async () => {
    ownDeck();
    await restoreAutoCards(DECK, []);
    expect(stub.state.insertCalls).toEqual([]);
  });

  // A substituted oracle id would otherwise land a card the add path refuses.
  it.each([
    ["off the commander's identity", CARD_OFF, "off-color-identity"],
    ["not commander legal", CARD_BANNED, "not-commander-legal"],
    ["the commander itself", CMDR, "is-commander"],
    ["absent from the catalog", CARD_ABSENT, "card not found"],
  ])("refuses a card %s", async (_label, oracleId, message) => {
    ownDeck();
    await expect(
      restoreAutoCards(DECK, [{ oracleId, quantity: 1 }]),
    ).rejects.toThrow(message);
    expect(restoredRows()).toEqual([]);
  });

  // The conflict clause skips a card the player re-added by hand, so counting
  // the receipt would overstate what the announcement claims to have put back.
  it("counts only the rows that land", async () => {
    ownDeck();
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    const restored = await restoreAutoCards(DECK, [
      { oracleId: CARD_A, quantity: 1 },
      { oracleId: CARD_B, quantity: 4 },
    ]);
    expect(restored).toBe(4);
  });

  it("refuses a deck the player does not own", async () => {
    await expect(
      restoreAutoCards(DECK, [{ oracleId: CARD_A, quantity: 1 }]),
    ).rejects.toThrow("deck not found");
  });
});

// ---------------------------------------------------------------------------
// fillLastSlotsOwned / fillLastSlotsUnowned — authorization boundary
// ---------------------------------------------------------------------------
// These tests constrain the explicit row.userId !== userId check inside
// requireDeck. The stub's `where` method ignores its predicate argument, so
// without the explicit check a wrong-owner row would pass through undetected.

describe("fillLastSlotsOwned — authorization", () => {
  const DECK = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const CMDR = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  /** Push a commander card so the fill can proceed past requireDeck if auth passes.
   *  Without this the test would pass on a downstream "commander not found" throw. */
  function withCommander() {
    stub.state.cards.push({ oracleId: CMDR, colorIdentity: ["B", "R", "G"] });
  }

  it("returns ok:false and performs no write when the deck belongs to another user", async () => {
    // Stub returns a deck row whose userId differs from the authenticated caller ("user_1").
    // withCommander() is set so that if the ownership check is absent the action
    // proceeds past requireDeck and reaches ok:true — proving the check matters.
    stub.state.decks.push({ id: DECK, userId: "user_other", commanderOracleId: CMDR });
    withCommander();

    const result = await fillLastSlotsOwned(DECK);

    expect(result.ok).toBe(false);
    // No deck_cards were written
    expect(stub.state.insertCalls).toEqual([]);
  });

  it("returns ok:false and performs no write when no deck row exists", async () => {
    // state.decks stays empty — deck not found
    withCommander();
    const result = await fillLastSlotsOwned(DECK);

    expect(result.ok).toBe(false);
    expect(stub.state.insertCalls).toEqual([]);
  });
});

describe("fillLastSlotsUnowned — authorization", () => {
  const DECK = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const CMDR = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  function withCommander() {
    stub.state.cards.push({ oracleId: CMDR, colorIdentity: ["B", "R", "G"] });
  }

  it("returns ok:false and performs no write when the deck belongs to another user", async () => {
    // Same logic as fillLastSlotsOwned: commander is present so that if the
    // ownership check is removed the action proceeds to ok:true, proving the check.
    stub.state.decks.push({ id: DECK, userId: "user_other", commanderOracleId: CMDR });
    withCommander();

    const result = await fillLastSlotsUnowned(DECK);

    expect(result.ok).toBe(false);
    // No deck_cards were written
    expect(stub.state.insertCalls).toEqual([]);
  });

  it("returns ok:false and performs no write when no deck row exists", async () => {
    // state.decks stays empty — deck not found
    withCommander();
    const result = await fillLastSlotsUnowned(DECK);

    expect(result.ok).toBe(false);
    expect(stub.state.insertCalls).toEqual([]);
  });
});

// requireDeck reads the `decks` table, so state.decks — not state.deckRows,
// which is the in-transaction deck_cards read — is what proves ownership here.
const OWNED_DECK = { id: "deck_1", userId: "user_1" };

describe("logGame", () => {
  beforeEach(() => {
    stub.state.insertCalls.length = 0;
    stub.state.revalidated.length = 0;
    stub.state.decks = [OWNED_DECK];
  });

  it("writes the game and one row per mark", async () => {
    const result = await logGame("deck_1", {
      result: "win",
      podSize: 4,
      worked: ["mana", "board"],
      hurt: ["card_flow"],
    });

    expect(result).toEqual({ ok: true });

    const games = stub.state.insertCalls.filter((c) => c.table === "deck_games");
    expect(games).toHaveLength(1);
    expect(games[0].values).toMatchObject({
      deckId: "deck_1",
      userId: "user_1",
      result: "win",
      podSize: 4,
    });

    const axes = stub.state.insertCalls.filter((c) => c.table === "deck_game_axes");
    expect(axes[0].values).toEqual([
      { gameId: expect.any(String), axis: "mana", polarity: "worked" },
      { gameId: expect.any(String), axis: "board", polarity: "worked" },
      { gameId: expect.any(String), axis: "card_flow", polarity: "hurt" },
    ]);
  });

  // No marks at all is the fifteen-second log, and it is valid. The axis
  // insert must be skipped entirely rather than called with an empty array,
  // which Drizzle rejects.
  it("writes no axis rows when nothing is marked", async () => {
    const result = await logGame("deck_1", {
      result: "loss", podSize: 4, worked: [], hurt: [],
    });
    expect(result).toEqual({ ok: true });
    expect(stub.state.insertCalls.filter((c) => c.table === "deck_game_axes")).toHaveLength(0);
  });

  // A crafted duplicate would otherwise collide with the (game_id, axis)
  // primary key and surface as a 500 rather than a refusal.
  it("deduplicates a repeated key within one list", async () => {
    await logGame("deck_1", {
      result: "win", podSize: 4, worked: ["mana", "mana"], hurt: [],
    });
    const axes = stub.state.insertCalls.filter((c) => c.table === "deck_game_axes");
    expect(axes[0].values).toHaveLength(1);
  });

  it.each([
    ["an unknown result", { result: "forfeit", podSize: 4, worked: [], hurt: [] }],
    ["a pod below two", { result: "win", podSize: 1, worked: [], hurt: [] }],
    ["a pod above eight", { result: "win", podSize: 9, worked: [], hurt: [] }],
    ["a fractional pod", { result: "win", podSize: 4.5, worked: [], hurt: [] }],
    ["an axis outside the vocabulary", { result: "win", podSize: 4, worked: ["tempo"], hurt: [] }],
    ["an axis on both sides", { result: "win", podSize: 4, worked: ["mana"], hurt: ["mana"] }],
    // A server action is a public endpoint: the declared input type does not
    // constrain what a crafted request can send.
    ["a date sent as a string", { result: "win", podSize: 4, playedAt: "2026-09-01", worked: [], hurt: [] }],
    ["an unparseable date", { result: "win", podSize: 4, playedAt: new Date("not a date"), worked: [], hurt: [] }],
    ["marks that are not a list", { result: "win", podSize: 4, worked: "mana", hurt: [] }],
    ["hurt marks that are not a list", { result: "win", podSize: 4, worked: [], hurt: 7 }],
    ["no input at all", null],
  ])("refuses %s without throwing", async (_label, input) => {
    const result = await logGame("deck_1", input as never);
    expect(result.ok).toBe(false);
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  it("refuses a game played in the future", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await logGame("deck_1", {
      result: "win", podSize: 4, playedAt: tomorrow, worked: [], hurt: [],
    });
    expect(result.ok).toBe(false);
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  // Neither action changes deck membership, so the collection and commander
  // surfaces must not be revalidated.
  it("revalidates only the deck surfaces", async () => {
    await logGame("deck_1", { result: "draw", podSize: 3, worked: [], hurt: [] });
    expect(stub.state.revalidated).toEqual(["/decks/deck_1", "/decks", "/"]);
  });
});

describe("deleteGame", () => {
  beforeEach(() => {
    stub.state.decks = [OWNED_DECK];
    stub.state.deckGames = [{ id: "game_1", deckId: "deck_1" }];
    stub.state.deleteCalls.length = 0;
    stub.state.revalidated.length = 0;
  });

  it("deletes the game and revalidates the deck surfaces", async () => {
    const result = await deleteGame("deck_1", "game_1");
    expect(result).toEqual({ ok: true });
    expect(stub.state.deleteCalls).toEqual([{ table: "deck_games", id: "game_1" }]);
    expect(stub.state.revalidated).toEqual(["/decks/deck_1", "/decks", "/"]);
  });

  // The axis rows go with it through ON DELETE CASCADE. An explicit delete of
  // deck_game_axes here would be a second source of truth for the same rule.
  it("does not delete the axis rows itself", async () => {
    await deleteGame("deck_1", "game_1");
    expect(stub.state.deleteCalls.some((c) => c.table === "deck_game_axes")).toBe(false);
  });

  // requireDeck proves the caller owns deck_1; it says nothing about whether
  // game_1 belongs to deck_1. Without the second check, a player could delete
  // another player's game by naming their own deck.
  it("refuses a game that belongs to a different deck", async () => {
    stub.state.deckGames = [{ id: "game_1", deckId: "deck_other" }];
    const result = await deleteGame("deck_1", "game_1");
    expect(result.ok).toBe(false);
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  it("refuses a game that does not exist", async () => {
    stub.state.deckGames = [];
    const result = await deleteGame("deck_1", "game_1");
    expect(result.ok).toBe(false);
    expect(stub.state.deleteCalls).toHaveLength(0);
  });
});
