import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted stub — must mirror the shape actions.ts imports from ../../db so the
// module can be mocked before it loads. We extend the existing test-harness
// pattern from actions.test.ts with the extras the last-slots actions need:
//   deckCards — rows the in-transaction read of deck_cards returns
//   onLock    — called when tx.execute fires (the for-update point), lets a
//               test mutate deckCards between planning and the lock
//   revalidated — collects every path passed to revalidatePath
// ---------------------------------------------------------------------------
const stub = vi.hoisted(() => {
  const nameOf = (table: unknown): string =>
    (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];

  const state = {
    // Explicit card rows returned by select().from(cards). A ranked id with no
    // row here produces no row in the tx select — the card-missing arm is reachable.
    cards: [] as Record<string, unknown>[],
    // Deck rows — used by requireDeck via select().from(decks)
    collectionItems: [] as Record<string, unknown>[],
    // collection_items rows — queried by fillLastSlotsUnowned for the bought count
    ownedItems: [] as { oracleId: string; userId: string; quantity: number }[],
    // Insert calls tracked as { table, values }
    insertCalls: [] as { table: string; values: unknown }[],
    // Rows representing cards currently in the deck (in-transaction read)
    deckCards: [] as { oracleId: string; quantity: number }[],
    // Whether the transaction should throw
    transactionError: null as Error | null,
    // Called when tx.execute fires (the for-update lock point)
    onLock: null as (() => void) | null,
    // Paths passed to revalidatePath
    revalidated: [] as string[],
  };

  function reset() {
    state.cards.length = 0;
    state.collectionItems.length = 0;
    state.ownedItems.length = 0;
    state.insertCalls.length = 0;
    state.deckCards.length = 0;
    state.transactionError = null;
    state.onLock = null;
    state.revalidated.length = 0;
    // Deck row so requireDeck succeeds
    state.collectionItems.push({
      id: "deck-1",
      userId: "user_1",
      commanderOracleId: "commander-oracle-id",
    });
    // Commander card (needed for the commander color-identity read and the
    // legality pass that checks cards.oracleId === commanderOracleId)
    state.cards.push({
      oracleId: "commander-oracle-id",
      commanderLegal: true,
      colorIdentity: ["W"],
    });
  }

  type SelectBuilder = {
    from: (table: unknown) => SelectFromBuilder;
  };
  type SelectFromBuilder = {
    where: (condition?: unknown) => Promise<Record<string, unknown>[]>;
    innerJoin: (table: unknown, condition: unknown) => SelectFromBuilder;
    orderBy: (...args: unknown[]) => SelectFromBuilder;
    groupBy: (...args: unknown[]) => Promise<Record<string, unknown>[]>;
  };

  function makeSelectBuilder(isTx = false): SelectBuilder {
    return {
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const builder: SelectFromBuilder = {
          where: async () => {
            if (tableName === "deck_cards" && isTx) return state.deckCards;
            if (tableName === "deck_cards") throw new Error("stub: deck_cards select outside tx — not exercised");
            if (tableName === "cards") return state.cards;
            if (tableName === "collection_items") return state.ownedItems;
            // decks table — used by requireDeck
            return state.collectionItems;
          },
          innerJoin: () => builder,
          orderBy: () => builder,
          groupBy: async () => state.collectionItems,
        };
        return builder;
      },
    };
  }

  function makeInsertBuilder(table: unknown) {
    const tableName = nameOf(table);
    return {
      values: (values: unknown) => {
        state.insertCalls.push({ table: tableName, values });
        return {
          returning: async () => [],
          onConflictDoUpdate: async () => {},
          onConflictDoNothing: async () => {},
        };
      },
    };
  }

  const tx = {
    insert: (table: unknown) => makeInsertBuilder(table),
    execute: async () => {
      state.onLock?.();
    },
    select: () => makeSelectBuilder(true),
  };

  const db = {
    select: () => makeSelectBuilder(false),
    selectDistinctOn: () => makeSelectBuilder(false),
    insert: (table: unknown) => makeInsertBuilder(table),
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      if (state.transactionError) throw state.transactionError;
      return fn(tx);
    },
  };

  return { db, state, reset };
});

// ---------------------------------------------------------------------------
// Hoisted ranked value — the synergy read returns this; individual tests set it.
// ---------------------------------------------------------------------------
const ranked = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock("../commanders/[slug]/synergy-read", () => ({
  readSynergyCards: () => Promise.resolve(ranked.value),
}));

// ---------------------------------------------------------------------------
// Module mocks — same pattern as actions.test.ts
// ---------------------------------------------------------------------------
vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    stub.state.revalidated.push(path);
  },
}));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("unexpected redirect");
  },
}));

// ---------------------------------------------------------------------------
// Convenience re-export so tests read `revalidated` directly
// ---------------------------------------------------------------------------
const revalidated = stub.state.revalidated;

// ---------------------------------------------------------------------------
// Copy keys — imported after mocks so the module resolves cleanly
// ---------------------------------------------------------------------------
import { synergyCopy } from "../../lib/copy/synergy-discovery";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build n deck-card rows whose quantities all equal 1, so the total is n. */
function rowsFor(n: number): { oracleId: string; quantity: number }[] {
  return Array.from({ length: n }, (_, i) => ({
    oracleId: `slot-${i.toString().padStart(4, "0")}`,
    quantity: 1,
  }));
}

/** A commander card row that passes validateCardForDeck. */
function commanderRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    oracleId: "commander-oracle-id",
    commanderLegal: true,
    colorIdentity: ["W"],
    ...overrides,
  };
}

/** A candidate card row that passes validateCardForDeck for the default commander. */
function cardRow(
  oracleId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    oracleId,
    commanderLegal: true,
    colorIdentity: [],
    ...overrides,
  };
}

/** A synergy card fixture. */
function synergy(id: string, pts: number, owned: boolean) {
  return {
    oracleId: id,
    name: id,
    typeLine: "Instant",
    facet: "spell",
    inclusionPct: null,
    synergyPts: pts,
    owned,
  };
}

beforeEach(() => {
  stub.reset();
  ranked.value = [];
});

// ---------------------------------------------------------------------------
// fillLastSlotsOwned
// ---------------------------------------------------------------------------
describe("fillLastSlotsOwned", () => {
  it("writes every placed card as auto so the sweep undoes it", async () => {
    stub.state.deckCards = rowsFor(97); // two slots open
    stub.state.cards.push(cardRow("o1"), cardRow("o2"));
    ranked.value = [synergy("o1", 90, true), synergy("o2", 80, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 2, total: 99, shortfall: 0 });
    expect(
      stub.state.insertCalls
        .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]))
        .every((r) => (r as Record<string, unknown>).auto === true),
    ).toBe(true);
  });

  it("stops at the 99 cap computed inside the lock, not before it", async () => {
    // The plan is made against 4 open slots; by the time the lock is taken the
    // deck holds 98. Only one card may land.
    stub.state.deckCards = rowsFor(95);
    stub.state.onLock = () => {
      stub.state.deckCards = rowsFor(98);
    };
    stub.state.cards.push(cardRow("o1"), cardRow("o2"), cardRow("o3"));
    ranked.value = [
      synergy("o1", 90, true),
      synergy("o2", 80, true),
      synergy("o3", 70, true),
    ];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1, total: 99 });
  });

  it("returns the shortfall when the owned pool runs out", async () => {
    stub.state.deckCards = rowsFor(90); // nine slots open
    stub.state.cards.push(cardRow("o1"), cardRow("u1"));
    ranked.value = [synergy("o1", 90, true), synergy("u1", 80, false)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1, total: 91, shortfall: 8 });
  });

  it("skips a card validateCardForDeck refuses rather than failing the whole fill", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.cards = [commanderRow(), cardRow("o1"), cardRow("bad", { colorIdentity: ["U"] })];
    ranked.value = [synergy("bad", 99, true), synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1 });
    expect(
      stub.state.insertCalls
        .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]))
        .map((r) => (r as Record<string, unknown>).oracleId),
    ).toEqual(["o1"]);
  });

  it("skips a ranked card absent from the catalog and continues the fill", async () => {
    stub.state.deckCards = rowsFor(97);
    // "missing" has no card row — it will be absent from byOracleId, so the
    // legality filter drops it. "o1" has a row and must land.
    stub.state.cards.push(cardRow("o1"));
    ranked.value = [synergy("missing", 99, true), synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1 });
    expect(
      stub.state.insertCalls
        .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]))
        .map((r) => (r as Record<string, unknown>).oracleId),
    ).toEqual(["o1"]);
  });

  // M3 — shortfall must be computed after the legality filter, not before.
  // If shortfall is pre-filter, a fill where one card is dropped reports
  // "0 short" while the deck is one card light.
  it("reports shortfall from post-filter card count when a card is dropped by legality", async () => {
    // 96 cards in deck → 3 open slots. Plan places 3, legality drops 1 → 2 land.
    // shortfall should be 1, not 0 (pre-filter value).
    stub.state.deckCards = rowsFor(96);
    stub.state.cards = [
      commanderRow(),
      cardRow("o1"),
      cardRow("o2"),
      cardRow("bad", { colorIdentity: ["U"] }), // off-identity, will be dropped
    ];
    ranked.value = [synergy("bad", 99, true), synergy("o1", 90, true), synergy("o2", 80, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 2, total: 98, shortfall: 1 });
  });

  it("returns the refusal rather than throwing when the write fails", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.transactionError = new Error("boom");
    ranked.value = [synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    await expect(fillLastSlotsOwned("deck-1")).resolves.toEqual({
      ok: false,
      message: synergyCopy.lastSlots.fillFailed,
    });
  });

  // M6 — cross-user authorization boundary. requireDeck must refuse when the
  // deck does not belong to the authenticated user.
  it("refuses when the deck does not belong to the authenticated user", async () => {
    stub.state.collectionItems = []; // no deck visible to this user
    stub.state.deckCards = rowsFor(97);
    ranked.value = [synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: false });
    // Nothing must have been inserted.
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  it("revalidates the claim surfaces, not just the deck's own", async () => {
    stub.state.deckCards = rowsFor(98);
    stub.state.cards.push(cardRow("o1"));
    ranked.value = [synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    await fillLastSlotsOwned("deck-1");
    expect(revalidated).toContain("/collection");
    expect(revalidated).toContain("/commanders");
  });
});

// ---------------------------------------------------------------------------
// fillLastSlotsUnowned
// ---------------------------------------------------------------------------
describe("fillLastSlotsUnowned", () => {
  it("does not filter on ownership", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.cards.push(cardRow("u1"), cardRow("o1"));
    // Both cards owned so bought=0; this test only checks what was inserted.
    stub.state.ownedItems = [
      { oracleId: "u1", userId: "user_1", quantity: 1 },
      { oracleId: "o1", userId: "user_1", quantity: 1 },
    ];
    ranked.value = [synergy("u1", 90, false), synergy("o1", 80, true)];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    expect(
      stub.state.insertCalls
        .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]))
        .map((r) => (r as Record<string, unknown>).oracleId),
    ).toEqual(["u1", "o1"]);
    expect(out).toMatchObject({ ok: true, added: 2 });
  });

  it("reports how many of the deck's cards are now unowned", async () => {
    // 97 pre-existing slots (all owned) + 2 top-up cards (neither owned).
    const existing = rowsFor(97);
    stub.state.deckCards = existing;
    stub.state.cards.push(cardRow("u1"), cardRow("u2"));
    // The 97 pre-existing cards are all owned; the two top-up cards are not.
    stub.state.ownedItems = existing.map((r) => ({
      oracleId: r.oracleId,
      userId: "user_1",
      quantity: 1,
    }));
    ranked.value = [synergy("u1", 90, false), synergy("u2", 80, false)];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    // `bought` is the whole deck's unowned count after the write, derived from
    // collection_items — not from the ranked list.
    expect(out).toMatchObject({ ok: true, bought: 2 });
  });

  it("counts an unowned deck card absent from the ranked list toward bought", async () => {
    // "hand-added" was placed outside the EDHREC ranking — it does not appear in
    // ranked.value at all. The player does not own it. After a top-up places "u1"
    // (also unowned), bought must be 2, not 1.
    const existing = rowsFor(97);
    stub.state.deckCards = [
      ...existing,
      { oracleId: "hand-added", quantity: 1 },
    ];
    stub.state.cards.push(cardRow("u1"));
    // The 97 slot-XXXX cards are owned; "hand-added" and "u1" are not.
    stub.state.ownedItems = existing.map((r) => ({
      oracleId: r.oracleId,
      userId: "user_1",
      quantity: 1,
    }));
    ranked.value = [synergy("u1", 90, false)];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1, bought: 2 });
  });

  it("returns the top-up refusal rather than throwing", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.transactionError = new Error("boom");
    ranked.value = [synergy("u1", 90, false)];
    const { fillLastSlotsUnowned } = await import("./actions");
    await expect(fillLastSlotsUnowned("deck-1")).resolves.toEqual({
      ok: false,
      message: synergyCopy.lastSlots.topUpFailed,
    });
  });

  // M6 — cross-user authorization boundary. requireDeck must refuse when the
  // deck's userId does not match the authenticated user. Simulated by clearing
  // collectionItems so the `select from decks where id = ? and userId = ?` query
  // returns no row — the same outcome as a deck owned by a different user.
  it("refuses when the deck does not belong to the authenticated user", async () => {
    stub.state.collectionItems = []; // no deck visible to this user
    stub.state.deckCards = rowsFor(97);
    ranked.value = [synergy("u1", 90, false)];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    expect(out).toMatchObject({ ok: false });
    // Nothing must have been inserted.
    expect(stub.state.insertCalls).toHaveLength(0);
  });
});
