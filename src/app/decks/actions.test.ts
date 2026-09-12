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
    // What an in-transaction `update(...).returning()` hands back. Empty means
    // the guarded decrement matched nothing, which is how a caller learns the
    // row was down to its last copy and must be deleted instead.
    updateReturning: [] as Record<string, unknown>[],
    fillPasses: [] as { ordinal: number }[],
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
  const paramValue = (condition: unknown): string | null => paramValues(condition)[0] ?? null;

  // Every bound value in the condition, depth-first, so a stub can model a
  // multi-column predicate rather than only the first `eq()` in it.
  const paramValues = (condition: unknown): string[] => {
    const found: string[] = [];
    const walk = (node: unknown) => {
      const value = (node as { value?: unknown } | undefined)?.value;
      if (typeof value === "string") found.push(value);
      for (const chunk of (node as { queryChunks?: unknown[] } | undefined)?.queryChunks ?? []) {
        walk(chunk);
      }
    };
    walk(condition);
    return found;
  };

  // A per-test fake for db.select chains
  type SelectBuilder = {
    from: (table: unknown) => SelectFromBuilder;
  };
  type SelectFromBuilder = {
    from?: unknown;
    where: (condition?: unknown) => PromiseLike<Record<string, unknown>[]> & {
      limit: (n: number) => Promise<Record<string, unknown>[]>;
    };
    innerJoin: (table: unknown, condition: unknown) => SelectFromBuilder;
    orderBy: (...args: unknown[]) => SelectFromBuilder;
    groupBy: (...args: unknown[]) => Promise<Record<string, unknown>[]>;
  };

  function makeSelectBuilder(): SelectBuilder {
    return {
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const rowsFor = () => {
          if (tableName === "cards") return state.cards;
          if (tableName === "decks") return state.decks;
          if (tableName === "deck_games") return state.deckGames;
          if (tableName === "deck_cards") return state.deckRows as Record<string, unknown>[];
          return state.collectionItems;
        };
        const builder: SelectFromBuilder = {
          // Thenable rather than async, because `fillDeck` chains `.limit(1)`
          // onto its emptiness check and most other callers await directly.
          where: () => Object.assign(
            Promise.resolve(rowsFor()),
            { limit: async (n: number) => rowsFor().slice(0, n) },
          ),
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
        if (tableName === "fill_passes") {
          returning.push({ id: "pass-new-uuid" });
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

  function makeDeleteBuilder(table: unknown) {
    return {
      // Thenable as well as chainable, because most deletes are awaited
      // directly and deleteGame reads back what it removed.
      where: (condition: unknown) => {
        const tableName = nameOf(table);
        const id = paramValue(condition);
        state.deleteCalls.push({ table: tableName, id });
        const bound = paramValues(condition);
        const rows =
          tableName === "deck_games"
            ? state.deckGames
                .filter((g) => bound.includes(g.id) && bound.includes(g.deckId))
                .map((g) => ({ id: g.id }))
            : [];
        return {
          returning: async () => rows,
          then: (resolve: (v: unknown) => unknown) => Promise.resolve(undefined).then(resolve),
        };
      },
    };
  }

  const tx = {
    insert: (table: unknown) => makeInsertBuilder(table),
    delete: (table: unknown) => makeDeleteBuilder(table),
    update: () => ({
      set: () => ({
        where: () => Object.assign(
          Promise.resolve(undefined),
          { returning: async () => state.updateReturning },
        ),
      }),
    }),
    execute: async () => {},
    // Table-aware, because `recordFillPass` reads the highest ordinal the deck
    // has used and would otherwise be handed deck card rows. That read is an
    // aggregate, so it always returns exactly one row.
    select: () => ({
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const rows = () => {
          if (tableName === "fill_passes") {
            return [{ highest: state.fillPasses.reduce((n, p) => Math.max(n, p.ordinal), 0) }];
          }
          if (tableName === "decks") return state.decks;
          // The commit reads type lines to keep basics off the buy list.
          if (tableName === "cards") return state.cards;
          return state.deckRows as unknown as Record<string, unknown>[];
        };
        return {
          where: () => Object.assign(
            Promise.resolve(rows()),
            {
              limit: async (n: number) => rows().slice(0, n),
              // `for("update")` — the row lock a guard reads under.
              for: async () => rows(),
            },
          ),
        };
      },
    }),
  };

  const db = {
    select: () => makeSelectBuilder(),
    selectDistinctOn: () => makeSelectBuilder(),
    insert: (table: unknown) => makeInsertBuilder(table),
    delete: (table: unknown) => makeDeleteBuilder(table),
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
  updateTag: () => {},
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

// Mock synergy-read so the deck actions under test need no live DB or EDHREC data
vi.mock("../commanders/[slug]/synergy-read", () => ({
  readSynergyCards: async () => [],
}));

// The version module and the claim model are mocked rather than served by the
// stub above. The stub's `where()` returns a thenable carrying only `limit`, so
// it has no `orderBy` for `newestVersion`, and its transaction object has no
// `delete` — `commitVersion` and `restoreDraftFromVersion` both throw inside
// it. Teaching it those shapes would re-test round trips `pnpm probe:claims`
// already proves against a real Postgres. What these tests own is the actions'
// guards, their arithmetic and their revalidation.
vi.mock("../../lib/decks/versions", () => ({
  newestVersion: vi.fn(),
  versionLiveAt: vi.fn(),
  versionCards: vi.fn(),
  commitVersion: vi.fn(),
  restoreDraftFromVersion: vi.fn(),
}));
vi.mock("../../lib/decks/availability-query", () => ({
  loadAvailability: vi.fn(async () => new Map()),
}));
// The asking deck's position after a pull. Mocked rather than driven off the db
// stub because the reader assembles a snapshot transaction, a diff, a claim read
// and a price join — what the action owns is which figures it reports.
vi.mock("../../lib/decks/draft-state", () => ({
  loadDraftState: vi.fn(),
}));

import {
  commitDeckVersion, createDeck, deleteGame, discardDeckDraft, fillDeck, logGame,
  pullCardFromDeck, restoreAutoCards,
} from "./actions";
import {
  commitVersion, newestVersion, restoreDraftFromVersion, versionCards, versionLiveAt,
} from "../../lib/decks/versions";
import { loadAvailability } from "../../lib/decks/availability-query";
import { loadDraftState } from "../../lib/decks/draft-state";
import type { DraftState } from "../../lib/decks/draft-shape";

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
  stub.state.updateReturning.length = 0;
  stub.state.fillPasses.length = 0;
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

  it("records the fill as a seed pass, with the rows it actually placed", async () => {
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(
      ...Array.from({ length: 10 }, (_, i) => rampCard(i)),
      ...Array.from({ length: 40 }, (_, i) => forestCard(i, 4)),
    );

    await runCreate();

    const pass = stub.state.insertCalls.find((c) => c.table === "fill_passes");
    expect(pass!.values).toMatchObject({ kind: "seed", ordinal: 1, openSlots: 99 });

    // The membership record is what every ledger count is derived from, so it
    // has to describe the same rows the deck got — including the stacked
    // quantity, or the seed line would report a card count nobody can see.
    const members = stub.state.insertCalls.find((c) => c.table === "fill_pass_cards")!
      .values as Array<Record<string, unknown>>;
    const placed = stub.state.insertCalls.find((c) => c.table === "deck_cards")!
      .values as Array<Record<string, unknown>>;
    expect(members).toHaveLength(placed.length);
    expect(members.map((m) => [m.oracleId, m.quantity]))
      .toEqual(placed.map((r) => [r.oracleId, r.quantity]));
  });

  // Gate 6, "fires once": the fill-failed banner's retry is the one path that
  // can run a seed fill against a deck that already exists, so it is the one
  // path that could write a second seed pass.
  it("records a seed pass when the failed fill is retried", async () => {
    stub.state.decks.push({ id: "deck-1", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));

    await fillDeck("deck-1");

    const passes = stub.state.insertCalls.filter((c) => c.table === "fill_passes");
    expect(passes).toHaveLength(1);
    expect(passes[0].values).toMatchObject({ deckId: "deck-1", kind: "seed", ordinal: 1 });
  });

  it("records no second pass when the retry meets a deck that already holds cards", async () => {
    stub.state.decks.push({ id: "deck-1", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));
    stub.state.deckRows.push({ oracleId: "ramp-00000000-aaaa-aaaa-aaaa-aaaaaaaaaaaa", quantity: 1 });

    await fillDeck("deck-1");

    expect(stub.state.insertCalls.some((c) => c.table === "fill_passes")).toBe(false);
  });

  it("records no pass when the fill placed nothing", async () => {
    // A collection thin enough to plan zero rows. The deck is still filled —
    // the question `filled` answers is "did a fill run" — but a pass that
    // placed nothing is not a pass and would render an empty ledger line.
    stub.state.cards.push(commanderCard());

    await runCreate();

    expect(stub.state.insertCalls.some((c) => c.table === "fill_passes")).toBe(false);
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

  it("refuses a partner that is the commander again", async () => {
    stub.state.cards.push(commanderCard({}));

    await expect(
      createDeck(COMMANDER_ORACLE, "My Deck", [], COMMANDER_ORACLE),
    ).rejects.toThrow("a deck's two commanders must be different cards");

    expect(stub.state.insertCalls.filter((c) => c.table === "decks").length).toBe(0);
  });

  it("refuses a partner id that is not a uuid before it reaches a query", async () => {
    stub.state.cards.push(commanderCard({}));

    await expect(createDeck(COMMANDER_ORACLE, "My Deck", [], "not-a-uuid")).rejects.toThrow(
      "partner not found",
    );

    expect(stub.state.insertCalls.filter((c) => c.table === "decks").length).toBe(0);
  });

  it("names the partner when the partner is the id that is missing", async () => {
    stub.state.cards.push(commanderCard({}));

    await expect(
      createDeck(COMMANDER_ORACLE, "My Deck", [], "99999999-9999-9999-9999-999999999999"),
    ).rejects.toThrow("partner not found");

    expect(stub.state.insertCalls.filter((c) => c.table === "decks").length).toBe(0);
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

  // The stamp says which list was on the table that night. A game backdated
  // to before a commit belongs to the version that was live then, so asking
  // for the newest would credit a result to a deck that did not yet exist.
  it("stamps a backdated game with the version live when it was played", async () => {
    const playedAt = new Date("2026-01-01T00:00:00Z");
    vi.mocked(versionLiveAt).mockResolvedValue({ ...aVersion(), id: "v-old" });
    await logGame("deck_1", { result: "win", podSize: 4, worked: [], hurt: [], playedAt });
    expect(versionLiveAt).toHaveBeenCalledWith("deck_1", playedAt);
    const [game] = stub.state.insertCalls.filter((c) => c.table === "deck_games");
    expect(game.values).toMatchObject({ versionId: "v-old" });
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
    // Every value is a real axis, so only the length gives the payload away.
    [
      "more marks than the vocabulary has axes",
      { result: "win", podSize: 4, worked: Array(9).fill("mana"), hurt: [] },
    ],
    [
      "more hurt marks than the vocabulary has axes",
      { result: "win", podSize: 4, worked: [], hurt: Array(9).fill("mana") },
    ],
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

  // The instant comes off the player's own clock. A browser running a minute
  // ahead of the server is logging tonight's game, not a future one, so it is
  // accepted — and stored no later than the server's own now.
  it("accepts a clock running slightly ahead and stores it clamped to server time", async () => {
    const sentAt = Date.now();
    const result = await logGame("deck_1", {
      result: "win", podSize: 4, playedAt: new Date(sentAt + 60_000), worked: [], hurt: [],
    });
    expect(result).toEqual({ ok: true });

    const games = stub.state.insertCalls.filter((c) => c.table === "deck_games");
    const { playedAt } = games[0].values as { playedAt: Date };
    expect(playedAt.getTime()).toBeGreaterThanOrEqual(sentAt);
    expect(playedAt.getTime()).toBeLessThanOrEqual(Date.now());
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
  // game_1 belongs to deck_1. The pairing is in the delete's own predicate, so
  // naming your own deck over someone else's game removes nothing.
  it("refuses a game that belongs to a different deck", async () => {
    stub.state.deckGames = [{ id: "game_1", deckId: "deck_other" }];
    const result = await deleteGame("deck_1", "game_1");
    expect(result.ok).toBe(false);
    expect(stub.state.revalidated).toHaveLength(0);
  });

  // A second tab can delete the same game first. The row count is what decides
  // the answer, so the loser of that race is told so rather than shown a
  // success for work it did not do.
  it("refuses a game that does not exist", async () => {
    stub.state.deckGames = [];
    const result = await deleteGame("deck_1", "game_1");
    expect(result.ok).toBe(false);
    expect(stub.state.revalidated).toHaveLength(0);
  });
});

const VERSION_ID = "44444444-4444-4444-8444-444444444444";
const DECK_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user_1";
const CMD = "22222222-2222-4222-8222-222222222222";
const CARD_A = "33333333-3333-4333-8333-333333333333";
const CARD_B = "77777777-7777-4777-8777-777777777777";

const aVersion = () => ({
  id: VERSION_ID,
  number: 1,
  committedAt: new Date(),
  note: null,
  commanderOracleId: CMD,
  partnerOracleId: null,
  commanderSince: new Date(),
  partnerSince: null,
});

describe("commitDeckVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub.state.revalidated.length = 0;
    stub.state.deleteCalls.length = 0;
    vi.mocked(newestVersion).mockResolvedValue(aVersion());
    vi.mocked(versionCards).mockResolvedValue([]);
    vi.mocked(loadAvailability).mockResolvedValue(new Map());
    vi.mocked(commitVersion).mockResolvedValue({
      version: { ...aVersion(), number: 2 },
      cardCount: 0,
    });
  });

  it("refuses a deck the user does not own", async () => {
    stub.state.decks.length = 0;
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(commitVersion).not.toHaveBeenCalled();
  });

  it("revalidates claim surfaces, because a commit moves every other deck's figures", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    await commitDeckVersion(DECK_ID, null);
    expect(stub.state.revalidated).toContain(`/decks/${DECK_ID}`);
    expect(stub.state.revalidated).toContain("/collection");
  });

  // The pull list is computed BEFORE the write. Afterwards the draft and the
  // newest version are identical by definition and the diff is empty.
  it("returns the pull list from what the version dropped", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.length = 0;
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.pull).toEqual([{ oracleId: CARD_A, from: 1, to: 0 }]);
  });

  // A card the deck already has a free copy of is not a purchase, and listing
  // it would send the player shopping for something on their own shelf.
  it("leaves a covered add off the buy list", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(loadAvailability).mockResolvedValue(
      new Map([[CARD_A, { owned: 1, hard: 0, soft: 0, free: 1, claims: [] }]]),
    );
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.buy).toEqual([]);
  });

  it("puts an add nobody can cover on the buy list", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.buy).toEqual([
      { oracleId: CARD_A, needed: 1, shortfall: 1, bucket: "unowned", heldBy: [] },
    ]);
  });

  // Basics are excluded from the availability model, so an added Forest comes
  // back with no row and would otherwise read as a card nobody owns — ten
  // Forests on a shopping list nobody would ever shop from.
  it("keeps a basic land off the buy list", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 10 });
    stub.state.cards.push({ oracleId: CARD_A, typeLine: "Basic Land — Forest" });
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.buy).toEqual([]);
  });

  // The same exclusion, on the other list. A basic dropped from the buy list but
  // kept in the pull list renders as a bare `Island` under "back in the pool" —
  // no count, no movement, and a claim the deck lost its Islands, on a card the
  // player has thirty of.
  it("drops basics from the pull list as well as the buy list", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_B, quantity: 9 });
    stub.state.cards.push({ oracleId: CARD_B, typeLine: "Basic Land — Island" });
    vi.mocked(versionCards).mockResolvedValue([
      { oracleId: CARD_B, quantity: 12 },
      { oracleId: CARD_A, quantity: 1 },
    ]);
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.pull).toEqual([{ oracleId: CARD_A, from: 1, to: 0 }]);
  });

  // Every row the snapshot took, basics included: the count is the size of the
  // list that was committed, not the size of the shopping decision — and it comes
  // back from the snapshot rather than from this transaction's own read of the
  // draft. A resolve inserting a card the deck did not hold takes no row lock the
  // commit holds, so the two reads can legitimately differ, and only the
  // snapshot's figure describes the version. The 10 against a draft of 1 is that
  // disagreement made deliberate.
  it("reports the card count the snapshot took, not its own read of the draft", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(commitVersion).mockResolvedValue({
      version: { ...aVersion(), number: 2 },
      cardCount: 10,
    });
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.cardCount).toBe(10);
  });

  // An empty note is not a note. Storing "" would render a blank line in the
  // history where the player wrote nothing.
  it("stores a whitespace-only note as null", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    await commitDeckVersion(DECK_ID, "   ");
    // The third argument is the caller's transaction: the diff behind the
    // receipt and the snapshot it describes are read under one lock.
    expect(commitVersion).toHaveBeenCalledWith(DECK_ID, null, expect.anything());
  });
});

describe("discardDeckDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub.state.revalidated.length = 0;
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    vi.mocked(newestVersion).mockResolvedValue(aVersion());
  });

  // A brew has nothing to go back to, and restoring it to an empty list would
  // silently delete the whole deck.
  it("refuses a deck with no version", async () => {
    vi.mocked(newestVersion).mockResolvedValue(null);
    const result = await discardDeckDraft(DECK_ID);
    expect(result.ok).toBe(false);
    expect(restoreDraftFromVersion).not.toHaveBeenCalled();
  });

  it("restores the newest version and revalidates", async () => {
    const result = await discardDeckDraft(DECK_ID);
    expect(result.ok).toBe(true);
    expect(restoreDraftFromVersion).toHaveBeenCalledWith(DECK_ID, VERSION_ID);
    expect(stub.state.revalidated).toContain(`/decks/${DECK_ID}`);
  });
});

describe("pullCardFromDeck", () => {
  const SOURCE_ID = "55555555-5555-4555-8555-555555555555";
  const ASKING_ID = "66666666-6666-4666-8666-666666666666";

  beforeEach(() => {
    vi.clearAllMocks();
    stub.state.revalidated.length = 0;
    stub.state.deleteCalls.length = 0;
    // BOTH decks: a pull calls requireDeck on the asking deck as well as the
    // source. The stub ignores the where clause, so leaving the asking deck
    // out passes by accident and would stop meaning anything the day it stops.
    stub.state.decks.push(
      { id: SOURCE_ID, userId: USER_ID, commanderOracleId: CMD },
      { id: ASKING_ID, userId: USER_ID, commanderOracleId: CMD },
    );
    vi.mocked(newestVersion).mockResolvedValue(aVersion());
    vi.mocked(commitVersion).mockResolvedValue({ version: { ...aVersion(), number: 2 }, cardCount: 0 });
    vi.mocked(loadDraftState).mockResolvedValue(askingDraft());
  });

  /** The asking deck's position: the cards it is waiting on, and what it owes.
   *  The action reads this twice — once to check the pull was one the review page
   *  actually offered, and once after the write for the figures it reports. */
  function askingDraft() {
    return {
      adds: [{ oracleId: CARD_A }, { oracleId: CARD_B }, { oracleId: CMD }],
      buyCount: 7,
      total: "$241.00",
    } as DraftState;
  }

  // Ownership proves the player may touch both decks, not that the app ever
  // offered this pull. Otherwise any two owned decks can be named and the source
  // made to lose a card nothing asked for.
  it("refuses a card the asking deck is not waiting on", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    vi.mocked(loadDraftState).mockResolvedValue({ ...askingDraft(), adds: [] } as DraftState);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(commitVersion).not.toHaveBeenCalled();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // One id for both ends is not a transfer: the deck loses a copy to satisfy a
  // want it already holds, and commits the loss.
  it("refuses a deck pulling from itself", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, SOURCE_ID);
    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(commitVersion).not.toHaveBeenCalled();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // The guard that stops a pull sweeping somebody else's half-finished
  // tinkering into a version they never asked for.
  it("refuses when the source deck already has pending changes", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 }, { oracleId: CARD_B, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: false, message: expect.stringContaining("pending") });
    expect(commitVersion).not.toHaveBeenCalled();
  });

  // Otherwise the decrement and the delete both match nothing and the commit
  // writes a version identical to its predecessor — history recording a pull
  // that never happened.
  it("refuses a card the source deck does not hold", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_B, ASKING_ID);
    expect(result.ok).toBe(false);
    expect(commitVersion).not.toHaveBeenCalled();
  });

  // A commander is a claim without being a `deck_cards` row, so a deck can be
  // offered as a card's holder on the strength of one. The refusal has to say
  // which of the two it is, or the reader is told the deck doesn't hold a card
  // it plainly leads with.
  it("refuses to pull the source deck's commander", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CMD, ASKING_ID);
    expect(result).toEqual({ ok: false, message: expect.stringContaining("commander") });
    expect(commitVersion).not.toHaveBeenCalled();
  });

  it("removes the card and commits a version recording it", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(stub.state.deleteCalls).toContainEqual({ table: "deck_cards", id: SOURCE_ID });
    // The third argument is the caller's transaction: the delete above and this
    // commit land together, or the draft loses a card its version still claims.
    expect(commitVersion).toHaveBeenCalledWith(SOURCE_ID, expect.any(String), expect.anything());
  });

  // A pull takes one copy. A deck sleeving four Relentless Rats that lends one
  // keeps three, so the row is decremented and never deleted.
  it("decrements rather than deleting when the deck holds more than one", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 4 });
    stub.state.updateReturning.push({ oracleId: CARD_A });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 4 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(stub.state.deleteCalls).not.toContainEqual({ table: "deck_cards", id: SOURCE_ID });
  });

  // The player is looking at the ASKING deck's buy tag when they take the pull.
  it("revalidates both decks", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(stub.state.revalidated).toContain(`/decks/${SOURCE_ID}`);
    expect(stub.state.revalidated).toContain(`/decks/${ASKING_ID}`);
  });

  // The control prints these two figures, and they have to be the server's:
  // a client that subtracts one from the count it was rendered with is guessing.
  it("reports the asking deck's position after the pull", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: true, buy: 7, total: "$241.00" });
    // After the revalidation, so the figures describe the world the reader is
    // about to be shown rather than the one the pull replaced.
    expect(loadDraftState).toHaveBeenCalledWith(ASKING_ID, USER_ID);
  });

  // The card has already moved by then. Failing the pull over the sentence
  // describing it would undo a write that succeeded — but the sentence cannot
  // claim a purchase of nothing, which is what a zero here would say.
  it("reports the pull with an unknown buy count when that read fails", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    // The first read is the guard's, and it has to succeed or nothing is pulled;
    // the one that fails is the read of where the pull left the asking deck.
    vi.mocked(loadDraftState)
      .mockResolvedValueOnce(askingDraft())
      .mockRejectedValue(new Error("read failed"));
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: true, buy: null, total: null });
  });

  // A brew holds nothing hard, so there is no claim to release and no version
  // to commit against.
  it("refuses a source deck that is not sleeved", async () => {
    vi.mocked(newestVersion).mockResolvedValue(null);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(false);
    expect(stub.state.deleteCalls).toHaveLength(0);
  });
});
