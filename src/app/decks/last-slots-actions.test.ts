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
    // Explicit card rows returned by select().from(cards). When a card oracle ID
    // appears in the synergy ranking but not here, the tx select synthesizes a
    // valid row automatically so tests that don't need custom card data still pass.
    cards: [] as Record<string, unknown>[],
    // collectionItems rows — used by requireDeck via select().from(decks) dispatch
    collectionItems: [] as Record<string, unknown>[],
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
    // Ref to the current ranked list so tx card selects can synthesize fallbacks
    // without an explicit stub.state.cards setup for every basic test.
    _rankedRef: null as Array<{ oracleId: string }> | null,
  };

  function reset() {
    state.cards.length = 0;
    state.collectionItems.length = 0;
    state.insertCalls.length = 0;
    state.deckCards.length = 0;
    state.transactionError = null;
    state.onLock = null;
    state.revalidated.length = 0;
    state._rankedRef = null;
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

  /** Return state.cards augmented with auto-synthesized valid rows for every
   *  oracle ID in the current ranked list that isn't explicitly present.
   *  This means tests that only care about fill counts don't have to populate
   *  state.cards for every candidate card — the stub handles it. */
  function cardsWithFallback(): Record<string, unknown>[] {
    if (!state._rankedRef) return state.cards;
    const known = new Set(state.cards.map((c) => c.oracleId as string));
    const extra: Record<string, unknown>[] = [];
    for (const c of state._rankedRef) {
      if (!known.has(c.oracleId)) {
        extra.push({ oracleId: c.oracleId, commanderLegal: true, colorIdentity: [] });
      }
    }
    return extra.length ? [...state.cards, ...extra] : state.cards;
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
            if (tableName === "cards") return isTx ? cardsWithFallback() : state.cards;
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
// We also wire it into stub.state._rankedRef so the tx stub can synthesize
// fallback card rows without each test having to set stub.state.cards manually.
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
  stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
});

// ---------------------------------------------------------------------------
// fillLastSlotsOwned
// ---------------------------------------------------------------------------
describe("fillLastSlotsOwned", () => {
  it("writes every placed card as auto so the sweep undoes it", async () => {
    stub.state.deckCards = rowsFor(97); // two slots open
    ranked.value = [synergy("o1", 90, true), synergy("o2", 80, true)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
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
    ranked.value = [
      synergy("o1", 90, true),
      synergy("o2", 80, true),
      synergy("o3", 70, true),
    ];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1, total: 99 });
  });

  it("returns the shortfall when the owned pool runs out", async () => {
    stub.state.deckCards = rowsFor(90); // nine slots open
    ranked.value = [synergy("o1", 90, true), synergy("u1", 80, false)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1, total: 91, shortfall: 8 });
  });

  it("skips a card validateCardForDeck refuses rather than failing the whole fill", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.cards = [commanderRow(), cardRow("o1"), cardRow("bad", { colorIdentity: ["U"] })];
    ranked.value = [synergy("bad", 99, true), synergy("o1", 90, true)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1 });
    expect(
      stub.state.insertCalls
        .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]))
        .map((r) => (r as Record<string, unknown>).oracleId),
    ).toEqual(["o1"]);
  });

  it("returns the refusal rather than throwing when the write fails", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.transactionError = new Error("boom");
    ranked.value = [synergy("o1", 90, true)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
    const { fillLastSlotsOwned } = await import("./actions");
    await expect(fillLastSlotsOwned("deck-1")).resolves.toEqual({
      ok: false,
      message: synergyCopy.lastSlots.fillFailed,
    });
  });

  it("revalidates the claim surfaces, not just the deck's own", async () => {
    stub.state.deckCards = rowsFor(98);
    ranked.value = [synergy("o1", 90, true)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
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
    ranked.value = [synergy("u1", 90, false), synergy("o1", 80, true)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
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
    stub.state.deckCards = rowsFor(97);
    ranked.value = [synergy("u1", 90, false), synergy("u2", 80, false)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    // `bought` is the whole deck's unowned count after the write, not this
    // call's — the strip states what the player still has to buy.
    expect(out).toMatchObject({ ok: true, bought: 2 });
  });

  it("returns the top-up refusal rather than throwing", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.transactionError = new Error("boom");
    ranked.value = [synergy("u1", 90, false)];
    stub.state._rankedRef = ranked.value as Array<{ oracleId: string }>;
    const { fillLastSlotsUnowned } = await import("./actions");
    await expect(fillLastSlotsUnowned("deck-1")).resolves.toEqual({
      ok: false,
      message: synergyCopy.lastSlots.topUpFailed,
    });
  });
});
