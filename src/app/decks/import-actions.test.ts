import { beforeEach, describe, expect, it, vi } from "vitest";

// The action module imports the db client, which throws at module init without a live URL.
const stub = vi.hoisted(() => {
  // Drizzle tags every table with its SQL name, so the fake can answer a query
  // by table without the hoisted factory importing the schema.
  const nameOf = (table: unknown): string =>
    (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];

  const state = {
    decks: [] as Record<string, unknown>[],
    unresolved: [] as Record<string, unknown>[],
    cards: [] as Record<string, unknown>[],
    inserts: [] as { values: Record<string, unknown>; mode: "update" | "nothing" }[],
    deletedFrom: [] as string[],
    revalidated: [] as string[],
    // Every WHERE the actions build, kept so the tests can prove the ownership
    // scoping is in the SQL rather than in the fake.
    wheres: [] as { table: string; condition: unknown }[],
  };

  const tx = {
    select: () => ({
      from: (table: unknown) => ({
        where: async (condition: unknown) => {
          const key = nameOf(table);
          state.wheres.push({ table: key, condition });
          if (key === "decks") return state.decks;
          if (key === "deck_unresolved_rows") return state.unresolved;
          return state.cards;
        },
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoUpdate: async () => {
          state.inserts.push({ values, mode: "update" });
        },
        onConflictDoNothing: async () => {
          state.inserts.push({ values, mode: "nothing" });
        },
      }),
    }),
    delete: (table: unknown) => ({
      // Drizzle's builder is a thenable that also offers .returning(), and both
      // call sites are exercised, so the fake has to be both too.
      where: (condition: unknown) => {
        const record = () => {
          state.deletedFrom.push(nameOf(table));
          state.wheres.push({ table: nameOf(table), condition });
          // Whole rows, not just ids: resolve now takes the quantity it inserts
          // from the delete's RETURNING rather than from a prior read.
          return state.unresolved.splice(0, state.unresolved.length);
        };
        return {
          then: (resolve: (v: unknown) => unknown) => Promise.resolve(record()).then(resolve),
          returning: async () => record(),
        };
      },
    }),
  };

  const db = {
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  };
  return { db, state };
});

vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => {
    stub.state.revalidated.push(p);
  },
}));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { deleteUnresolvedRow, resolveUnresolvedRow } from "./import-actions";
import { claimSurfaces } from "../../lib/decks/revalidate";

const dialect = new PgDialect();

/** The bound parameters of the first WHERE built against `table`. */
function whereParams(table: string): unknown[] {
  const entry = stub.state.wheres.find((w) => w.table === table);
  if (!entry) throw new Error(`no query against ${table}`);
  return dialect.sqlToQuery(entry.condition as SQL).params;
}

const DECK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ROW = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ORACLE = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const COMMANDER = "dddddddd-dddd-dddd-dddd-dddddddddddd";

function seed({
  deckOwned = true,
  rowBelongs = true,
  typeLine = "Creature — Human Wizard",
  commanderLegal = true,
}: {
  deckOwned?: boolean;
  rowBelongs?: boolean;
  typeLine?: string;
  commanderLegal?: boolean;
} = {}) {
  // An unowned deck / foreign row is modelled as the ownership-scoped query
  // returning nothing, which is exactly what Postgres does for them.
  if (deckOwned) stub.state.decks.push({ id: DECK, commanderOracleId: COMMANDER });
  if (rowBelongs) stub.state.unresolved.push({ id: ROW, quantity: 3 });
  stub.state.cards.push({ typeLine, commanderLegal });
}

beforeEach(() => {
  stub.state.decks.length = 0;
  stub.state.unresolved.length = 0;
  stub.state.cards.length = 0;
  stub.state.inserts.length = 0;
  stub.state.deletedFrom.length = 0;
  stub.state.revalidated.length = 0;
  stub.state.wheres.length = 0;
});

describe("resolveUnresolvedRow", () => {
  it("adds the card and drops the line", async () => {
    seed();
    await resolveUnresolvedRow(DECK, ROW, ORACLE);
    expect(stub.state.inserts).toEqual([
      { values: { deckId: DECK, oracleId: ORACLE }, mode: "nothing" },
    ]);
    expect(stub.state.deletedFrom).toEqual(["deck_unresolved_rows"]);
    // Resolving a row puts a card in the deck, which is a claim — so the
    // surfaces that draw availability off deck rows are invalidated with it.
    expect(stub.state.revalidated).toEqual(claimSurfaces(DECK));
  });

  it("leaves a non-basic already in the deck at one copy", async () => {
    seed();
    await resolveUnresolvedRow(DECK, ROW, ORACLE);
    // onConflictDoNothing is the increment guard: singleton means a repeat is a
    // no-op rather than a duplicate row.
    expect(stub.state.inserts[0].mode).toBe("nothing");
    expect(stub.state.inserts[0].values).not.toHaveProperty("quantity");
  });

  it("increments a basic land already in the deck by the line's quantity", async () => {
    seed({ typeLine: "Basic Land — Island" });
    await resolveUnresolvedRow(DECK, ROW, ORACLE);
    expect(stub.state.inserts).toEqual([
      { values: { deckId: DECK, oracleId: ORACLE, quantity: 3 }, mode: "update" },
    ]);
  });

  it("never puts the commander into the 99, but still answers the line", async () => {
    seed();
    await resolveUnresolvedRow(DECK, ROW, COMMANDER);
    expect(stub.state.inserts).toEqual([]);
    expect(stub.state.deletedFrom).toEqual(["deck_unresolved_rows"]);
  });

  it("scopes both lookups server-side", async () => {
    seed();
    await resolveUnresolvedRow(DECK, ROW, ORACLE);
    expect(whereParams("decks")).toEqual(expect.arrayContaining([DECK, "user_1"]));
    expect(whereParams("deck_unresolved_rows")).toEqual(expect.arrayContaining([ROW, DECK]));
  });

  it("rejects a row that belongs to another deck", async () => {
    seed({ rowBelongs: false });
    await expect(resolveUnresolvedRow(DECK, ROW, ORACLE)).rejects.toThrow("unresolved row not found");
    expect(stub.state.inserts).toEqual([]);
  });

  // The line is claimed by the DELETE, not by a read that a second call could
  // make before the first one finished. Two clicks landing together used to
  // both see the row, and the basic-land branch adds the line's quantity — so
  // the second one added three more Islands to a deck that had gained them once.
  it("gives the same line to only one of two concurrent resolves", async () => {
    seed({ typeLine: "Basic Land — Island" });
    await Promise.allSettled([
      resolveUnresolvedRow(DECK, ROW, ORACLE),
      resolveUnresolvedRow(DECK, ROW, ORACLE),
    ]);
    expect(stub.state.inserts).toEqual([
      { values: { deckId: DECK, oracleId: ORACLE, quantity: 3 }, mode: "update" },
    ]);
  });

  it("rejects a deck that belongs to another user", async () => {
    seed({ deckOwned: false });
    await expect(resolveUnresolvedRow(DECK, ROW, ORACLE)).rejects.toThrow("deck not found");
    expect(stub.state.inserts).toEqual([]);
    expect(stub.state.deletedFrom).toEqual([]);
  });

  // The picker's search filters to commander-legal cards, so only a crafted
  // request reaches this — which is the same reason importDeck re-validates the
  // commander the picker sent back.
  it("refuses a card that is not commander legal", async () => {
    seed({ commanderLegal: false });
    await expect(resolveUnresolvedRow(DECK, ROW, ORACLE)).rejects.toThrow(
      "card is not commander legal",
    );
    expect(stub.state.inserts).toEqual([]);
  });

  it("rejects an oracle id no card carries", async () => {
    seed();
    stub.state.cards.length = 0;
    await expect(resolveUnresolvedRow(DECK, ROW, ORACLE)).rejects.toThrow("card not found");
    // The delete is issued before this point now, so the line only survives
    // because the transaction rolls back — which the fake does not model.
    expect(stub.state.inserts).toEqual([]);
  });
});

describe("deleteUnresolvedRow", () => {
  it("deletes the row and revalidates", async () => {
    seed();
    await deleteUnresolvedRow(DECK, ROW);
    expect(stub.state.deletedFrom).toEqual(["deck_unresolved_rows"]);
    expect(stub.state.revalidated).toEqual([`/decks/${DECK}`, "/decks"]);
  });

  it("scopes both lookups server-side", async () => {
    seed();
    await deleteUnresolvedRow(DECK, ROW);
    expect(whereParams("decks")).toEqual(expect.arrayContaining([DECK, "user_1"]));
    expect(whereParams("deck_unresolved_rows")).toEqual(expect.arrayContaining([ROW, DECK]));
  });

  it("rejects a row that belongs to another deck", async () => {
    seed({ rowBelongs: false });
    await expect(deleteUnresolvedRow(DECK, ROW)).rejects.toThrow("unresolved row not found");
    expect(stub.state.revalidated).toEqual([]);
  });

  it("rejects a deck that belongs to another user", async () => {
    seed({ deckOwned: false });
    await expect(deleteUnresolvedRow(DECK, ROW)).rejects.toThrow("deck not found");
    expect(stub.state.deletedFrom).toEqual([]);
  });
});
