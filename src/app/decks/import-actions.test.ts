import { beforeEach, describe, expect, it, vi } from "vitest";

// The action module imports the db client, which throws at module init without a live URL.
const stub = vi.hoisted(() => {
  // Drizzle tags every table with its SQL name, so the fake can answer a query
  // by table without the hoisted factory importing the schema.
  const nameOf = (table: unknown): string =>
    (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];

  const DECK_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const state = {
    decks: [] as Record<string, unknown>[],
    unresolved: [] as Record<string, unknown>[],
    cards: [] as Record<string, unknown>[],
    /** `collection_items` rows the printing read answers with (deck printings). */
    collection: [] as Record<string, unknown>[],
    inserts: [] as { values: Record<string, unknown>; mode: "update" | "nothing" }[],
    deletedFrom: [] as string[],
    updates: [] as { table: string; values: Record<string, unknown> }[],
    revalidated: [] as string[],
    updatedTags: [] as string[],
    // Every WHERE the actions build, kept so the tests can prove the ownership
    // scoping is in the SQL rather than in the fake.
    wheres: [] as { table: string; condition: unknown }[],
  };

  const tx = {
    select: () => ({
      from: (table: unknown) => ({
        // A thenable that also offers `.for()`: the resolve path locks the deck
        // row so its insert of a card the deck did not hold cannot slip past a
        // concurrent commit, and awaiting the builder directly is what every
        // other read here does.
        where: (condition: unknown) => {
          const rows = () => {
            const key = nameOf(table);
            state.wheres.push({ table: key, condition });
            if (key === "decks") return state.decks;
            if (key === "deck_unresolved_rows") return state.unresolved;
            if (key === "collection_items") return state.collection;
            return state.cards;
          };
          return {
            then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows()).then(resolve),
            for: async () => rows(),
          };
        },
      }),
    }),
    insert: () => ({
      // importDeck inserts arrays and awaits the builder directly, while the
      // resolve path inserts one row and chains a conflict clause — so the
      // builder has to be a thenable that also offers both clauses.
      values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
        const record = (mode: "update" | "nothing") => {
          for (const v of Array.isArray(values) ? values : [values]) {
            state.inserts.push({ values: v, mode });
          }
        };
        return {
          then: (resolve: (v: unknown) => unknown) => {
            record("nothing");
            return Promise.resolve(undefined).then(resolve);
          },
          returning: async () => {
            record("nothing");
            return [{ id: DECK_ID }];
          },
          onConflictDoUpdate: async () => record("update"),
          onConflictDoNothing: async () => record("nothing"),
        };
      },
    }),
    // `touchDeck` stamps the deck at the end of a resolve. Recorded rather than
    // swallowed: the rule that answering a line counts as editing the deck is
    // asserted below.
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async (condition: unknown) => {
          state.updates.push({ table: nameOf(table), values });
          state.wheres.push({ table: nameOf(table), condition });
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

  // importDeck reads outside the transaction as well as inside it, so the client
  // answers the same queries the transaction handle does.
  const db = {
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    select: tx.select,
    selectDistinct: tx.select,
  };
  return { db, state, DECK_ID };
});

// The catalog importDeck matches against. Mocked rather than read, because the
// fake db answers a select by table and the catalog query selects columns.
const catalog = vi.hoisted(() => {
  // Uuids rather than readable slugs: the actions validate the shape of every id
  // they are handed before querying, so a slug would exercise that refusal
  // instead of the deck the test means to describe.
  let n = 0;
  const card = (over: Record<string, unknown> & { name: string }) => ({
    oracleId: `a0000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    scryfallId: `scry-${over.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    typeLine: "Artifact",
    oracleText: null as string | null,
    commanderLegal: true,
    colorIdentity: [] as string[],
    imageUri: null as string | null,
    ...over,
  });
  return [
    card({ name: "Sol Ring" }),
    card({
      name: "Atreus, God of War",
      typeLine: "Legendary Creature — God",
      colorIdentity: ["R", "W"],
      oracleText: "Partner—Father & son (You can have two commanders if both have Partner—Father & son.)",
    }),
    card({
      name: "Kratos, God of War",
      typeLine: "Legendary Creature — God",
      colorIdentity: ["U", "R"],
      oracleText: "Partner—Father & son (You can have two commanders if both have Partner—Father & son.)",
    }),
    card({
      name: "Ishai, Ojutai Dragonspeaker",
      typeLine: "Legendary Creature — Bird Monk",
      colorIdentity: ["W", "U"],
      oracleText: "Flying\nPartner (You can have two commanders if both have partner.)",
    }),
  ];
});

vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/collection/import", () => ({
  loadMatchInputs: async () => ({ catalog, indexes: {} }),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => {
    stub.state.revalidated.push(p);
  },
  updateTag: (t: string) => {
    stub.state.updatedTags.push(t);
  },
}));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { deleteUnresolvedRow, importDeck, resolveUnresolvedRow } from "./import-actions";
import { claimSurfaces, deckSurfaces } from "../../lib/decks/revalidate";

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
  stub.state.collection.length = 0;
  delete process.env.DECK_PRINTINGS_ENABLED;
  stub.state.inserts.length = 0;
  stub.state.deletedFrom.length = 0;
  stub.state.revalidated.length = 0;
  stub.state.updatedTags.length = 0;
  stub.state.wheres.length = 0;
});

describe("importDeck — printings (deck printings)", () => {
  const SOL_RING = "a0000000-0000-4000-8000-000000000001";
  const ATREUS = "a0000000-0000-4000-8000-000000000002";
  const KRATOS = "a0000000-0000-4000-8000-000000000003";
  const LIST =
    "Commander\n1 Atreus, God of War (SLD) 2212\n1 Kratos, God of War (SLD) 2213\n\nDeck\n1 Sol Ring (LTC) 284";
  const run = () => importDeck({ text: LIST, source: "paste", name: "Father and son" });
  const pickInserts = () => stub.state.inserts.filter((i) => "setCode" in i.values).map((i) => i.values);

  beforeEach(() => {
    stub.state.cards.push(...catalog);
    // Holdings: Atreus in the named printing (an older uppercase set code), Sol Ring in another.
    stub.state.collection.push(
      { oracleId: ATREUS, setCode: "SLD", collectorNumber: "2212" },
      { oracleId: SOL_RING, setCode: "c21", collectorNumber: "263" },
    );
  });

  it("makes a held printing the pick, commanders included, and counts the rest", async () => {
    process.env.DECK_PRINTINGS_ENABLED = "true";
    const result = await run();
    if (!result.ok) throw new Error(JSON.stringify(result));
    expect(pickInserts()).toEqual([
      { deckId: stub.DECK_ID, oracleId: ATREUS, setCode: "sld", collectorNumber: "2212" },
    ]);
    // Kratos and Sol Ring named printings the player does not hold.
    expect(result.printingsKept).toBe(1);
    expect(result.printingsNotOwned).toBe(2);
    expect(KRATOS).toBeTruthy();
  });

  it("writes no picks and counts nothing with the switch off", async () => {
    const result = await run();
    if (!result.ok) throw new Error(JSON.stringify(result));
    expect(pickInserts()).toEqual([]);
    expect(result.printingsKept).toBe(0);
    expect(result.printingsNotOwned).toBe(0);
    expect(stub.state.wheres.some((w) => w.table === "collection_items")).toBe(false);
  });
});

describe("importDeck — a declared pair", () => {
  // The ids the catalog fixture above minted, in the order it declares them.
  const SOL_RING = "a0000000-0000-4000-8000-000000000001";
  const ATREUS = "a0000000-0000-4000-8000-000000000002";
  const KRATOS = "a0000000-0000-4000-8000-000000000003";
  const ISHAI = "a0000000-0000-4000-8000-000000000004";

  // The re-validation reads the commander cards back out of `cards`, so the
  // fixtures the fake answers with are the catalog rows themselves.
  const seedCards = () => stub.state.cards.push(...catalog);

  const run = (text: string) =>
    importDeck({ text, source: "paste", name: "Father and son" });

  it("writes both commanders and files neither as a deck card", async () => {
    seedCards();
    const result = await run("Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Sol Ring");
    expect(result.ok).toBe(true);

    const deckInsert = stub.state.inserts.find((i) => "commanderOracleId" in i.values);
    expect(deckInsert?.values.commanderOracleId).toBe(ATREUS);
    expect(deckInsert?.values.partnerOracleId).toBe(KRATOS);

    const cardInserts = stub.state.inserts.filter((i) => "quantity" in i.values);
    expect(cardInserts.map((i) => i.values.oracleId)).toEqual([SOL_RING]);
  });

  it("leaves partnerOracleId null for a single declared commander", async () => {
    seedCards();
    await run("Commander\n1 Atreus, God of War\n\nDeck\n1 Sol Ring");
    const deckInsert = stub.state.inserts.find((i) => "commanderOracleId" in i.values);
    expect(deckInsert?.values.partnerOracleId).toBeNull();
  });

  // A pair the paste declares is the record of a deck that exists, so it is
  // imported and the mismatch is said out loud rather than refused.
  it("accepts an illegally paired declaration and notes it", async () => {
    seedCards();
    const result = await run(
      "Commander\n1 Atreus, God of War\n1 Ishai, Ojutai Dragonspeaker\n\nDeck\n1 Sol Ring",
    );
    expect(result.notes).toContainEqual({
      kind: "illegalPairDeclared",
      primary: "Atreus, God of War",
      partner: "Ishai, Ojutai Dragonspeaker",
    });
    const deckInsert = stub.state.inserts.find((i) => "commanderOracleId" in i.values);
    expect(deckInsert?.values.partnerOracleId).toBe(ISHAI);
  });

  // A pair the *user* picked is refused, because the picker never offered it —
  // only a crafted request can reach this.
  it("refuses an illegal pair the request supplied", async () => {
    seedCards();
    await expect(
      importDeck({
        text: "1 Sol Ring",
        source: "paste",
        name: "Nope",
        commanderOracleId: ATREUS,
        partnerOracleId: ISHAI,
      }),
    ).rejects.toThrow("commanders cannot be paired");
    expect(stub.state.inserts).toEqual([]);
  });

  it("refuses a partner that is the commander again", async () => {
    seedCards();
    await expect(
      importDeck({
        text: "1 Sol Ring",
        source: "paste",
        name: "Nope",
        commanderOracleId: ATREUS,
        partnerOracleId: ATREUS,
      }),
    ).rejects.toThrow("a deck's two commanders must be different cards");
    expect(stub.state.inserts).toEqual([]);
  });

  it("refuses a partner id that is not a uuid before it reaches a query", async () => {
    seedCards();
    await expect(
      importDeck({
        text: "1 Sol Ring",
        source: "paste",
        name: "Nope",
        commanderOracleId: ATREUS,
        partnerOracleId: "not-a-uuid",
      }),
    ).rejects.toThrow("partner not found");
    expect(stub.state.inserts).toEqual([]);
  });

  // The picker shows the declared pair pre-selected and lets the player remove
  // it. That removal is an answer, not an absence: an explicit null means one
  // commander, and only an unanswered slot falls back to what the paste said.
  it("honours an explicit null partner over the paste's declaration", async () => {
    seedCards();
    await importDeck({
      text: "Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Sol Ring",
      source: "paste",
      name: "Just Atreus",
      commanderOracleId: ATREUS,
      partnerOracleId: null,
    });
    const deckInsert = stub.state.inserts.find((i) => "commanderOracleId" in i.values);
    expect(deckInsert?.values.partnerOracleId).toBeNull();
  });
});

describe("importDeck — a CSV-shaped upload", () => {
  it("parses a clean CSV export by its recognized header and matches real cards", async () => {
    // A CSV export declares no commander — unlike a paste's `Commander` section or
    // *CMDR* flag, there is no equivalent column — so a matched legendary always
    // reaches the picker. This proves the row parsed and matched correctly rather
    // than being read, wrongly, as a one-line text decklist.
    const result = await importDeck({
      text: 'Name,Quantity\n"Atreus, God of War",1\nSol Ring,1\n',
      source: "file",
      name: "From a CSV",
    });
    if (result.ok || result.reason !== "commanderNeeded") {
      throw new Error(`expected commanderNeeded, got ${JSON.stringify(result)}`);
    }
    expect(result.candidates.map((c) => c.name)).toEqual(["Atreus, God of War"]);
  });

  it("refuses a CSV-shaped file with a bad row and writes nothing", async () => {
    const result = await importDeck({
      text: "Name,Quantity\nSol Ring,1\nForest,abc\n",
      source: "file",
      name: "Broken",
    });
    expect(result).toEqual({
      ok: false,
      reason: "csvInvalid",
      detail: 'Row 3: invalid quantity "abc"',
      notes: [],
    });
    expect(stub.state.inserts).toEqual([]);
  });
});

describe("resolveUnresolvedRow", () => {
  it("adds the card and drops the line", async () => {
    seed();
    await resolveUnresolvedRow(DECK, ROW, ORACLE);
    expect(stub.state.inserts).toEqual([
      { values: { deckId: DECK, oracleId: ORACLE }, mode: "nothing" },
    ]);
    expect(stub.state.deletedFrom).toEqual(["deck_unresolved_rows"]);
    // Answering a line is an edit: the deck the player is left looking at is
    // not the one they had, so Home's resume block must be able to say so.
    // And, in the same transaction, the deck's stored analysis goes stale (`touchDeck`).
    expect(stub.state.updates).toEqual([
      { table: "decks", values: { lastEditedAt: expect.anything() } },
      { table: "deck_profiles", values: { dirty: true } },
    ]);
    // Resolving a row puts a card in the deck, which is a claim — so the
    // surfaces that draw availability off deck rows are invalidated with it,
    // and the commander detail route with them: its rank is counted over a
    // window that excludes built commanders, so a deck write moves it.
    // Every other deck's review page comes with them by route pattern: a
    // membership change here decides whether a row over there still offers a
    // pull, and `claimSurfaces` names this deck's review page alone.
    // `/decks/[id]` and `/collection/proxies` ride along since proxies: a claim
    // change moves figures on OTHER decks' own pages — the copy it frees belongs
    // to whichever deck was going short for it — and the proxy list reads the
    // same facts.
    expect(stub.state.revalidated).toEqual([
      ...claimSurfaces(DECK),
      "/commanders/[slug]",
      "/decks/[id]/changes",
      // The import receipt: its contested rows are read live against the claim model, so any
      // claim write can move what an older receipt says about who is short.
      "/collection/replace/summary/[uploadId]",
      "/decks/[id]",
      "/collection/proxies",
    ]);
    // And the reader's cached list payloads, which the revalidated pages read.
    expect(stub.state.updatedTags).toEqual(["user-lists:user_1"]);
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
    // A dropped line changes no claim, so the availability surfaces stay out.
    expect(stub.state.revalidated).toEqual(deckSurfaces(DECK));
    expect(stub.state.updatedTags).toEqual([]);
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
