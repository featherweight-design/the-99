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
    // How many times collection_items was read. The stub answers an unfiltered
    // `in ()` happily where Postgres would not, so the guard against it is only
    // observable as a read that never happens.
    collectionReads: 0,
    // Insert calls tracked as { table, values }
    insertCalls: [] as { table: string; values: unknown }[],
    // Rows representing cards currently in the deck (in-transaction read).
    // `auto` defaults to true on read — a card the app placed — because that is
    // what every fill path here produces; a kept card sets it false explicitly.
    deckCards: [] as { oracleId: string; quantity: number; auto?: boolean }[],
    // Whether the transaction should throw
    transactionError: null as Error | null,
    // Called when tx.execute fires (the for-update lock point)
    onLock: null as (() => void) | null,
    // Paths passed to revalidatePath
    revalidated: [] as string[],
    // fill_passes rows. Read two ways: as the highest ordinal a deck+kind has
    // used (recordFillPass's aggregate) and as the deck's passes in full
    // (undoFillPass, which needs every one of them to attribute a card).
    fillPasses: [] as { id: string; deckId: string; kind: string; ordinal: number }[],
    // fill_pass_cards rows — the membership attribution is computed from
    fillPassMembers: [] as { passId: string; oracleId: string; quantity?: number }[],
    // { table } per delete, so a delete can be asserted on what it targeted
    deleteCalls: [] as { table: string }[],
    // { table, set } per update — the decrement path a stacked row takes
    updateCalls: [] as { table: string; set: unknown }[],
    // Stands in for a keep landing between the undo's read and its writes: both
    // predicates re-check `auto = true`, so they match nothing and return no
    // rows. The stub cannot read a predicate, so the race is set here instead.
    concurrentKeep: false,
  };

  function reset() {
    state.cards.length = 0;
    state.collectionItems.length = 0;
    state.ownedItems.length = 0;
    state.collectionReads = 0;
    state.insertCalls.length = 0;
    state.deckCards.length = 0;
    state.transactionError = null;
    state.onLock = null;
    state.revalidated.length = 0;
    state.fillPasses.length = 0;
    state.fillPassMembers.length = 0;
    state.deleteCalls.length = 0;
    state.updateCalls.length = 0;
    state.concurrentKeep = false;
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

  function makeSelectBuilder(isTx = false, fields?: unknown): SelectBuilder {
    return {
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const builder: SelectFromBuilder = {
          where: async () => {
            if (tableName === "deck_cards" && isTx) {
              return state.deckCards.map((r) => ({ auto: true, ...r }));
            }
            if (tableName === "deck_cards") throw new Error("stub: deck_cards select outside tx — not exercised");
            if (tableName === "cards") return state.cards;
            // Two different reads of one table, told apart by what they select:
            // recordFillPass asks for `highest` and gets exactly one row back;
            // undoFillPass asks for the pass columns and gets the deck's passes.
            if (tableName === "fill_passes") {
              const asks = fields as Record<string, unknown> | undefined;
              if (asks && "highest" in asks) {
                return [{ highest: state.fillPasses.reduce((n, p) => Math.max(n, p.ordinal), 0) }];
              }
              // createdAt is derived from the ordinal so the summariser's
              // newest-first sort is deterministic in tests.
              return state.fillPasses.map((p) => ({
                openSlots: 0, createdAt: new Date(p.ordinal * 1000), ...p,
              }));
            }
            if (tableName === "fill_pass_cards") {
              return state.fillPassMembers.map((m) => ({ quantity: 1, ...m }));
            }
            if (tableName === "collection_items") {
              state.collectionReads += 1;
              return state.ownedItems;
            }
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
        // A pass insert has to answer with the id recordFillPass hands its
        // membership rows, and the row has to join the table so the next
        // ordinal read sees it.
        const inserted: Record<string, unknown>[] = [];
        if (tableName === "fill_passes") {
          const row = values as { deckId: string; kind: string; ordinal: number };
          const id = `pass-${state.fillPasses.length + 1}`;
          state.fillPasses.push({ id, ...row });
          inserted.push({ id });
        }
        return {
          returning: async () => inserted,
          onConflictDoUpdate: async () => {},
          onConflictDoNothing: async () => {},
        };
      },
    };
  }

  function makeDeleteBuilder(table: unknown) {
    const tableName = nameOf(table);
    state.deleteCalls.push({ table: tableName });
    // What a `deck_cards` delete takes back. The stub cannot read the
    // predicate, so it answers with the deck's app-owned rows — the tests that
    // assert a count seed no app-owned row the undo leaves standing.
    const taken = tableName === "deck_cards" && !state.concurrentKeep
      ? state.deckCards.filter((r) => r.auto !== false).map((r) => ({ quantity: r.quantity }))
      : [];
    return {
      // Awaited directly by the sweep and with `.returning()` by the undo, so
      // the result has to answer to both.
      where: () => Object.assign(Promise.resolve(taken), { returning: async () => taken }),
    };
  }

  function makeUpdateBuilder(table: unknown) {
    const tableName = nameOf(table);
    return {
      set: (values: unknown) => {
        state.updateCalls.push({ table: tableName, set: values });
        const matched = tableName === "deck_cards" && !state.concurrentKeep
          ? state.deckCards.filter((r) => r.auto !== false).map((r) => ({ oracleId: r.oracleId }))
          : [];
        return {
          where: () => Object.assign(Promise.resolve(matched), { returning: async () => matched }),
        };
      },
    };
  }

  const tx = {
    insert: (table: unknown) => makeInsertBuilder(table),
    execute: async () => {
      state.onLock?.();
    },
    select: (fields?: unknown) => makeSelectBuilder(true, fields),
    delete: (table: unknown) => makeDeleteBuilder(table),
    update: (table: unknown) => makeUpdateBuilder(table),
  };

  const db = {
    select: (fields?: unknown) => makeSelectBuilder(false, fields),
    selectDistinctOn: () => makeSelectBuilder(false),
    insert: (table: unknown) => makeInsertBuilder(table),
    delete: (table: unknown) => makeDeleteBuilder(table),
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

/** A UUID-shaped oracle id. `commitTopOff` checks the shape before it reaches
    Postgres, so the ids the ticked list sends have to be real ones. */
function uuid(n: number): string {
  const tail = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${tail}`;
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

  // An empty deck whose fill places nothing leaves no ids to ask about, and
  // Postgres refuses `in ()`. The stub is more forgiving than the database, so
  // the guard is asserted as a read that does not happen rather than as an
  // error that is not thrown.
  it("asks the collection nothing when the fill leaves the deck empty", async () => {
    stub.state.deckCards = [];
    ranked.value = [];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 0, total: 0, bought: 0 });
    expect(stub.state.collectionReads).toBe(0);
  });

  it("counts an unowned stacked row by its copies, not as one card", async () => {
    // A deck of 94 owned singles plus four unowned Forests in one row. `bought`
    // is a card count — the announcement pairs it with a total that sums
    // quantities — so the stack has to report four, not the one distinct id.
    const existing = rowsFor(94);
    stub.state.deckCards = [...existing, { oracleId: "forest", quantity: 4 }];
    stub.state.cards.push(cardRow("u1"));
    stub.state.ownedItems = existing.map((r) => ({
      oracleId: r.oracleId,
      userId: "user_1",
      quantity: 1,
    }));
    ranked.value = [synergy("u1", 90, false)];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    // Four Forests plus the one card the top-up placed.
    expect(out).toMatchObject({ ok: true, added: 1, bought: 5 });
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

// ---------------------------------------------------------------------------
// commitTopOff
// ---------------------------------------------------------------------------
describe("commitTopOff", () => {
  it("places the ticked cards as auto and records them as one pass", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.cards.push(cardRow(uuid(1)), cardRow(uuid(2)));
    const { commitTopOff } = await import("./actions");
    const out = await commitTopOff("deck-1", [uuid(1), uuid(2)]);

    expect(out).toMatchObject({ ok: true, added: 2, total: 99, passId: "pass-1" });
    expect(stub.state.insertCalls.find((c) => c.table === "deck_cards")!.values)
      .toEqual([
        { deckId: "deck-1", oracleId: uuid(1), quantity: 1, auto: true },
        { deckId: "deck-1", oracleId: uuid(2), quantity: 1, auto: true },
      ]);
    // openSlots is the gap the lock found, which is what the ledger line states.
    expect(stub.state.insertCalls.find((c) => c.table === "fill_passes")!.values)
      .toMatchObject({ kind: "top_off", openSlots: 2, ordinal: 1 });
  });

  // The list is the plan here, so an unowned card is a deliberate choice rather
  // than a fallback — and the commit row promised a figure for exactly it.
  it("counts only the cards this act placed toward boughtDelta", async () => {
    const existing = rowsFor(97);
    stub.state.deckCards = existing;
    stub.state.cards.push(cardRow(uuid(1)), cardRow(uuid(2)));
    stub.state.ownedItems = [{ oracleId: uuid(1), userId: "user_1", quantity: 1 }];
    const { commitTopOff } = await import("./actions");
    expect(await commitTopOff("deck-1", [uuid(1), uuid(2)]))
      .toMatchObject({ ok: true, boughtDelta: 1 });
  });

  it("refuses a selection larger than the open slots rather than truncating it", async () => {
    stub.state.deckCards = rowsFor(98); // one slot open
    stub.state.cards.push(cardRow(uuid(1)), cardRow(uuid(2)));
    const { commitTopOff } = await import("./actions");
    expect(await commitTopOff("deck-1", [uuid(1), uuid(2)])).toEqual({
      ok: false,
      message: synergyCopy.lastSlots.topUpFailed,
    });
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  // A hand-add in another tab spends the slot between the list being drawn and
  // the commit arriving. The count is re-read under the lock, so the refusal is
  // the same one a stale tick gets — never an overfilled deck.
  it("refuses when a concurrent hand-add closes the last slot", async () => {
    stub.state.deckCards = rowsFor(98);
    stub.state.onLock = () => {
      stub.state.deckCards = rowsFor(99);
    };
    stub.state.cards.push(cardRow(uuid(1)));
    const { commitTopOff } = await import("./actions");
    expect(await commitTopOff("deck-1", [uuid(1)])).toMatchObject({ ok: false });
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  // A ticked card the player had already added by hand costs no slot, so it must
  // not count against the cap: measuring the raw selection would refuse a commit
  // the deck has room for.
  it("does not count an already-present card against the open slots", async () => {
    // 97 other cards plus the ticked one the player already added: 98 built,
    // one slot open, and two cards ticked.
    stub.state.deckCards = [...rowsFor(97), { oracleId: uuid(1), quantity: 1 }];
    stub.state.cards.push(cardRow(uuid(1)), cardRow(uuid(2)));
    const { commitTopOff } = await import("./actions");
    // Two ticked, but one is already here — only the other one lands.
    expect(await commitTopOff("deck-1", [uuid(1), uuid(2)]))
      .toMatchObject({ ok: true, added: 1, total: 99 });
    expect(stub.state.insertCalls.find((c) => c.table === "fill_pass_cards")!.values)
      .toEqual([{ passId: "pass-1", oracleId: uuid(2), quantity: 1 }]);
  });

  // Unlike the fill, which skips one card and places the rest: the player chose
  // these cards specifically, and placing all but one would make the receipt lie.
  it("refuses the whole commit when one ticked card is illegal", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.cards.push(cardRow(uuid(1)), cardRow(uuid(2), { colorIdentity: ["U"] }));
    const { commitTopOff } = await import("./actions");
    expect(await commitTopOff("deck-1", [uuid(1), uuid(2)])).toMatchObject({ ok: false });
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  it("refuses a duplicated oracle id", async () => {
    stub.state.deckCards = rowsFor(97);
    stub.state.cards.push(cardRow(uuid(1)));
    const { commitTopOff } = await import("./actions");
    expect(await commitTopOff("deck-1", [uuid(1), uuid(1)])).toMatchObject({ ok: false });
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  // The conflict clause skips it, so the pass must not claim it either — an undo
  // would otherwise offer to take a card the player put there themselves.
  it("leaves a card the player added by hand out of the pass", async () => {
    stub.state.deckCards = [...rowsFor(96), { oracleId: uuid(1), quantity: 1 }];
    stub.state.cards.push(cardRow(uuid(1)), cardRow(uuid(2)));
    const { commitTopOff } = await import("./actions");
    const out = await commitTopOff("deck-1", [uuid(1), uuid(2)]);
    expect(out).toMatchObject({ ok: true, added: 1, total: 98 });
    expect(stub.state.insertCalls.find((c) => c.table === "fill_pass_cards")!.values)
      .toEqual([{ passId: "pass-1", oracleId: uuid(2), quantity: 1 }]);
  });

  it("refuses when the deck does not belong to the authenticated user", async () => {
    stub.state.collectionItems = [];
    stub.state.deckCards = rowsFor(97);
    stub.state.cards.push(cardRow(uuid(1)));
    const { commitTopOff } = await import("./actions");
    expect(await commitTopOff("deck-1", [uuid(1)])).toMatchObject({ ok: false });
    expect(stub.state.insertCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// undoFillPass
// ---------------------------------------------------------------------------
describe("undoFillPass", () => {
  const passId = uuid(900);

  function pass(overrides: Partial<{ deckId: string; kind: string }> = {}) {
    stub.state.fillPasses = [{ id: passId, deckId: "deck-1", kind: "top_off", ordinal: 1, ...overrides }];
  }

  it("removes the pass's live rows and reports the cards that went", async () => {
    pass();
    stub.state.fillPassMembers = [
      { passId, oracleId: uuid(1) },
      { passId, oracleId: uuid(2) },
    ];
    // The second card was kept, so it is the player's and the undo cannot
    // reach it — one card goes, and one is reported.
    stub.state.deckCards = [
      { oracleId: uuid(1), quantity: 1 },
      { oracleId: uuid(2), quantity: 1, auto: false },
    ];
    const { undoFillPass } = await import("./actions");
    expect(await undoFillPass("deck-1", passId)).toBe(1);
    expect(stub.state.deleteCalls).toEqual([{ table: "deck_cards" }]);
  });

  // The membership record is immutable, and the line goes on its own: with no
  // live rows left the pass summarises to nothing and drops out of the ledger.
  it("deletes neither the pass row nor its membership", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1) }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 1 }];
    const { undoFillPass } = await import("./actions");
    await undoFillPass("deck-1", passId);
    expect(stub.state.deleteCalls.some((c) => c.table !== "deck_cards")).toBe(false);
  });

  it("removes nothing the second time the same pass is undone", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1) }];
    stub.state.deckCards = []; // the first undo already took it
    const { undoFillPass } = await import("./actions");
    expect(await undoFillPass("deck-1", passId)).toBe(0);
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // One oracle id can sit in two passes: pass 1 places it, the player removes
  // it, pass 2 places it again. The newest pass owns the live row, so undoing
  // the older one must leave it exactly where the newer one put it.
  it("leaves a card a newer pass placed alone", async () => {
    const older = uuid(901);
    const newer = uuid(902);
    stub.state.fillPasses = [
      { id: older, deckId: "deck-1", kind: "top_off", ordinal: 1 },
      { id: newer, deckId: "deck-1", kind: "top_off", ordinal: 2 },
    ];
    stub.state.fillPassMembers = [
      { passId: older, oracleId: uuid(1) },
      { passId: newer, oracleId: uuid(1) },
    ];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 1 }];
    const { undoFillPass } = await import("./actions");
    expect(await undoFillPass("deck-1", older)).toBe(0);
    expect(stub.state.deleteCalls).toHaveLength(0);
    // And the newer pass still owns it, so its own undo does reach it.
    expect(await undoFillPass("deck-1", newer)).toBe(1);
  });

  // A stacked basic can hold copies the player added on top of the pass's. The
  // undo takes back what the pass placed and leaves the rest standing.
  it("decrements a stacked row rather than taking the player's copies", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1), quantity: 2 }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 5 }];
    const { undoFillPass } = await import("./actions");
    expect(await undoFillPass("deck-1", passId)).toBe(2);
    expect(stub.state.deleteCalls).toHaveLength(0);
    expect(stub.state.updateCalls).toEqual([{ table: "deck_cards", set: expect.anything() }]);
  });

  // `keepAutoCard` clears the flag without taking the deck lock, so a keep can
  // land between the undo's read and its writes. Both predicates re-check
  // `auto = true` and match nothing; the count has to say so rather than
  // reporting what the read predicted.
  it("reports nothing removed when a keep lands mid-undo", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1) }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 1 }];
    stub.state.concurrentKeep = true;
    const { undoFillPass } = await import("./actions");
    expect(await undoFillPass("deck-1", passId)).toBe(0);
  });

  it("refuses a pass belonging to another deck", async () => {
    pass({ deckId: "deck-2" });
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1) }];
    const { undoFillPass } = await import("./actions");
    await expect(undoFillPass("deck-1", passId)).rejects.toThrow();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // The seed line names the sweep as its reversal and grows no undo of its own.
  // The guard exists so a hand-made call cannot do what the UI declines to offer.
  it("refuses a seed pass", async () => {
    pass({ kind: "seed" });
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1) }];
    const { undoFillPass } = await import("./actions");
    await expect(undoFillPass("deck-1", passId)).rejects.toThrow();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  it("refuses when the deck does not belong to the authenticated user", async () => {
    stub.state.collectionItems = [];
    pass();
    const { undoFillPass } = await import("./actions");
    await expect(undoFillPass("deck-1", passId)).rejects.toThrow();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // Ordinals come from max(), and an undo leaves the pass row in place — so the
  // number an undone pass was given is never handed out again, and a later pass
  // keeps the label the ledger already showed for it.
  it("does not renumber later passes after an undo", async () => {
    stub.state.fillPasses = [
      { id: uuid(901), deckId: "deck-1", kind: "top_off", ordinal: 1 },
      { id: uuid(902), deckId: "deck-1", kind: "top_off", ordinal: 2 },
    ];
    stub.state.deckCards = rowsFor(97);
    stub.state.cards.push(cardRow(uuid(1)));
    const { commitTopOff } = await import("./actions");
    await commitTopOff("deck-1", [uuid(1)]);
    expect(stub.state.insertCalls.find((c) => c.table === "fill_passes")!.values)
      .toMatchObject({ ordinal: 3 });
  });
});
