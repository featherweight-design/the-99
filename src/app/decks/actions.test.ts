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
    // Insert calls tracked as { table, values, returning? }
    insertCalls: [] as { table: string; values: unknown; returning: unknown[] | null }[],
    // Tracks whether the transaction was called and whether it should reject
    transactionError: null as Error | null,
    // Whether getEdhrecData should reject
    edhrecError: null as Error | null,
    // redirect target captured
    redirectTarget: null as string | null,
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
  };

  const db = {
    select: () => makeSelectBuilder(),
    selectDistinctOn: () => makeSelectBuilder(),
    insert: (table: unknown) => makeInsertBuilder(table),
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      if (state.transactionError) throw state.transactionError;
      return fn(tx);
    },
  };

  return { db, state };
});

vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
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

import { createDeck } from "./actions";

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
  stub.state.insertCalls.length = 0;
  stub.state.transactionError = null;
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
