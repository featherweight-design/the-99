import { describe, it, expect, vi, beforeEach } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

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
    // collection_items rows — queried by the commit for the bought count
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
    // Stands in for a `removeCardFromDeck` landing between the read and the
    // writes, which takes no deck lock. The decrement re-checks
    // `quantity > held`, so it matches nothing and the row falls through to the
    // delete; this is what that row holds by then.
    concurrentShrink: null as number | null,
    // The mirror: copies added between the read and the writes, so the delete's
    // `quantity <= held` matches nothing and the row keeps every copy.
    concurrentGrowth: false,
    // What the deck counts once an undo's writes have landed.
    settledBuilt: 0,
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
    state.concurrentShrink = null;
    state.concurrentGrowth = false;
    state.settledBuilt = 0;
    // Deck row so requireDeck succeeds
    state.collectionItems.push({
      id: "deck-1",
      userId: "user_1",
      commanderOracleId: "commander-oracle-id",
      // A single-commander deck, which is the 99 ceiling every figure below is
      // written against.
      partnerOracleId: null,
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
              // undoFillPass's closing count, told apart from the row read by
              // what it selects. Its own state field because the stub's deletes
              // do not mutate `deckCards`, so summing that would report the
              // deck as it was before the undo rather than after it.
              if ((fields as Record<string, unknown> | undefined)?.copies) {
                return [{ copies: state.settledBuilt }];
              }
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
        // `onConflictDoNothing()` is awaited by some callers and read back with
        // `.returning()` by the top-off, whose stamp depends on whether the
        // insert actually wrote — so the fake is both, as Drizzle's builder is.
        // This stub has no conflict state, so a `deck_cards` insert reports the
        // rows it was handed: "wrote" means "was asked to write".
        const conflictResult = () => {
          const rows = tableName === "deck_cards"
            ? (Array.isArray(values) ? values : [values])
            : inserted;
          return Object.assign(Promise.resolve(rows), { returning: async () => rows });
        };
        return {
          returning: async () => inserted,
          onConflictDoUpdate: async () => {},
          onConflictDoNothing: conflictResult,
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
    const shrunk = state.concurrentShrink;
    const takeable = tableName === "deck_cards" && !state.concurrentKeep && !state.concurrentGrowth;
    const taken = takeable
      ? state.deckCards
        .filter((r) => r.auto !== false)
        .map((r) => ({ quantity: shrunk ?? r.quantity }))
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
        const matched = tableName === "deck_cards" && !state.concurrentKeep && state.concurrentShrink === null
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
  updateTag: () => {},
}));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("unexpected redirect");
  },
}));

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

/** The writes to the deck's CARDS, which is what these tests are about. */
const cardUpdates = () => stub.state.updateCalls.filter((c) => c.table === "deck_cards");

/** Whether the act stamped `decks.last_edited_at` — Home's resume block's input.
    Separated from `cardUpdates` because the two answer different questions and
    a test that counted them together would pass a stamp for a card write. */
const stamped = () => stub.state.updateCalls.some((c) => c.table === "decks");

beforeEach(() => {
  stub.reset();
  ranked.value = [];
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
    expect((await undoFillPass("deck-1", passId)).removed).toBe(1);
    expect(stub.state.deleteCalls).toEqual([{ table: "deck_cards" }]);
  });

  // The announcement states a deck size, and the browser cannot derive one:
  // every other control stays live during an undo, so "what I held minus what
  // came out" would state a size that never existed if an edit landed meanwhile.
  it("counts the deck inside the transaction and reports the settled size", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1) }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 1 }];
    stub.state.settledBuilt = 96;
    const { undoFillPass } = await import("./actions");
    expect(await undoFillPass("deck-1", passId)).toEqual({ removed: 1, built: 96 });
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
    expect((await undoFillPass("deck-1", passId)).removed).toBe(0);
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
    expect((await undoFillPass("deck-1", older)).removed).toBe(0);
    expect(stub.state.deleteCalls).toHaveLength(0);
    // And the newer pass still owns it, so its own undo does reach it.
    expect((await undoFillPass("deck-1", newer)).removed).toBe(1);
  });

  // A stacked basic can hold copies the player added on top of the pass's. The
  // undo takes back what the pass placed and leaves the rest standing.
  it("decrements a stacked row rather than taking the player's copies", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1), quantity: 2 }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 5 }];
    const { undoFillPass } = await import("./actions");
    expect((await undoFillPass("deck-1", passId)).removed).toBe(2);
    expect(stub.state.deleteCalls).toHaveLength(0);
    expect(cardUpdates()).toEqual([{ table: "deck_cards", set: expect.anything() }]);
    // And the deck is stamped, because copies really did come out of it.
    expect(stamped()).toBe(true);
    // The copies left behind are the player's, so the same write clears the
    // marker — otherwise the pass would go on claiming them and a second undo
    // would take cards it never placed.
    expect(cardUpdates()[0].set).toMatchObject({ auto: false });
  });

  // Following the decrement above: the row is the player's now, so the pass has
  // nothing live left and its second undo is a no-op.
  it("takes nothing more from a stacked row it has already decremented", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1), quantity: 2 }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 3, auto: false }];
    const { undoFillPass } = await import("./actions");
    expect((await undoFillPass("deck-1", passId)).removed).toBe(0);
    expect(cardUpdates()).toHaveLength(0);
    expect(stub.state.deleteCalls).toHaveLength(0);
    // An undo that removed nothing wrote nothing, so the deck was not edited.
    expect(stamped()).toBe(false);
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
    expect((await undoFillPass("deck-1", passId)).removed).toBe(0);
  });

  // `removeCardFromDeck` decrements without taking the deck lock either, so a
  // stacked row read as holding more than the pass placed can hold exactly that
  // by the time the undo writes. The decrement re-checks the quantity, matches
  // nothing, and the row goes to the delete instead of being written negative.
  it("deletes a stacked row a concurrent remove has cut back to what the pass placed", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1), quantity: 2 }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 5 }];
    stub.state.concurrentShrink = 2;
    const { undoFillPass } = await import("./actions");
    expect((await undoFillPass("deck-1", passId)).removed).toBe(2);
    expect(cardUpdates()).toHaveLength(1);
    expect(stub.state.deleteCalls).toEqual([{ table: "deck_cards" }]);
    expect(stamped()).toBe(true);
  });

  // The mirrored race: a row the read said held exactly what the pass placed has
  // gained copies since. Deleting it whole would take the player's, so the
  // predicate matches nothing and the undo honestly reports removing none.
  it("leaves a row that has grown since the read, and says nothing came out", async () => {
    pass();
    stub.state.fillPassMembers = [{ passId, oracleId: uuid(1), quantity: 2 }];
    stub.state.deckCards = [{ oracleId: uuid(1), quantity: 2 }];
    stub.state.concurrentGrowth = true;
    const { undoFillPass } = await import("./actions");
    expect((await undoFillPass("deck-1", passId)).removed).toBe(0);
    expect(cardUpdates()).toHaveLength(0);
    expect(stamped()).toBe(false);
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
