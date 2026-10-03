import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The action module imports the db client, which throws at module init without a live URL.
/** A drizzle `sql` template rendered to something a test can match on.
 *
 *  RECURSES into nested fragments: `sql`select ${proxiedMembership(...)}`` holds
 *  another sql object, and a serializer that stopped at the top level returned
 *  the outer words only — so a matcher looking for `deck_cards` saw nothing and
 *  the test failed for a reason that had nothing to do with the code. */
const sqlText = (query: unknown): string => {
  const chunks = (query as { queryChunks?: unknown[] })?.queryChunks;
  if (!Array.isArray(chunks)) return "";
  return chunks
    .map((c) => {
      if (typeof c === "string") return c;
      const v = c as { value?: unknown; name?: unknown; queryChunks?: unknown[] };
      if (Array.isArray(v?.queryChunks)) return sqlText(c);
      if (Array.isArray(v?.value)) return v.value.join(" ");
      if (typeof v?.name === "string") return v.name;
      return "";
    })
    .join(" ");
};

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
    /**
     * Makes ONE raw read throw, matched on a fragment of its SQL. Blanket
     * failure is useless here: every raw read on the pull path would throw and
     * the refusal would come from whichever ran first, which is not the branch
     * under test.
     */
    executeError: null as Error | null,
    executeErrorMatch: null as string | null,
    /** Rows the next raw reads return, and the SQL they were asked. */
    executeRows: null as unknown[] | null,
    executeTexts: [] as string[],
    // The rows already in the deck, returned by the in-transaction read
    deckRows: [] as { oracleId: string; quantity: number }[],
    // The same read, per deck, for the one action that reads TWO decks' drafts
    // in one transaction. A pull's guards are decisions about how the two lists
    // differ, so a stub that hands both decks the same rows cannot express the
    // case. Any deck with no entry here falls back to `deckRows`.
    deckRowsByDeck: {} as Record<string, { oracleId: string; quantity: number }[]>,
    // What an in-transaction `update(...).returning()` hands back. Empty means
    // the guarded decrement matched nothing, which is how a caller learns the
    // row was down to its last copy and must be deleted instead.
    updateReturning: [] as Record<string, unknown>[],
    // Every `update(...)`, by table. `decks` among them is the touch stamp —
    // Home's resume order — which is a different question from what happened to
    // the cards, so the two are read apart rather than counted together.
    updateCalls: [] as { table: string; values: unknown }[],
    // Whether an `onConflictDoNothing()` insert into `deck_cards` actually
    // writes. False is the repeat-add case: the statement runs and the clause
    // swallows it, which is what the add path's stamp branches on.
    insertConflictWrites: true,
    fillPasses: [] as { ordinal: number }[],
    // Whether getEdhrecData should reject
    edhrecError: null as Error | null,
    // redirect target captured
    redirectTarget: null as string | null,
    // Rows returned when querying `deck_games` (used by deleteGame's pairing check)
    deckGames: [] as { id: string; deckId: string }[],
    // Rows returned when querying `deck_versions`. Ordered as the caller asked
    // for them: the stub cannot sort, so a test that cares about which row comes
    // back first states that order here.
    deckVersions: [] as Record<string, unknown>[],
    // Delete calls tracked as { table, id } — the id lifted out of the eq() condition
    deleteCalls: [] as { table: string; id: string | null }[],
    // Every path passed to revalidatePath, in order
    revalidated: [] as string[],
    /** Callbacks handed to `after()`, run by the test that wants them. */
    afters: [] as (() => unknown)[],
    // Lines the deck's import never matched a card for. Only the first-version
    // guard reads this: they are not `deck_cards` rows, so no card count sees
    // them, and a v1 frozen over them silently drops them.
    unresolvedRows: 0,
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

  // The numeric bound values, for a predicate the stub has to compare rather than
  // match — `lt(deckVersions.number, n)`.
  const paramNumbers = (condition: unknown): number[] => {
    const found: number[] = [];
    const walk = (node: unknown) => {
      const value = (node as { value?: unknown } | undefined)?.value;
      if (typeof value === "number") found.push(value);
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
      orderBy: (...args: unknown[]) => {
        limit: (n: number) => Promise<Record<string, unknown>[]>;
      };
    };
    innerJoin: (table: unknown, condition: unknown) => SelectFromBuilder;
    orderBy: (...args: unknown[]) => SelectFromBuilder;
    groupBy: (...args: unknown[]) => Promise<Record<string, unknown>[]>;
  };

  function makeSelectBuilder(): SelectBuilder {
    return {
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const rowsFor = (condition?: unknown) => {
          if (tableName === "cards") return state.cards;
          if (tableName === "decks") return state.decks;
          if (tableName === "deck_games") return state.deckGames;
          if (tableName === "deck_versions") {
            // The one table whose predicate the stub models, because the guard
            // under test is exactly "this version belongs to this deck": a stub
            // that ignored the deck id would pass on an empty table and prove
            // only that a missing version is refused. A fixture row with no
            // `deckId` is left alone, so a test that does not care about the
            // guard does not have to name one.
            const bound = paramValues(condition);
            // The `lt(number, ...)` half as well, because the predecessor read is
            // exactly "the highest number below this one": a stub that ignored it
            // would hand back the asked-for version itself as its own predecessor
            // and the test would pass on a wrong answer. Sorted descending here,
            // which is the order both reads of this table ask for.
            const below = paramNumbers(condition)[0];
            return state.deckVersions
              .filter((row) => row.deckId === undefined || bound.includes(row.deckId as string))
              .filter(
                (row) =>
                  below === undefined ||
                  row.number === undefined ||
                  (row.number as number) < below,
              )
              .slice()
              .sort((a, b) => (b.number as number) - (a.number as number));
          }
          if (tableName === "deck_cards") return state.deckRows as Record<string, unknown>[];
          return state.collectionItems;
        };
        const builder: SelectFromBuilder = {
          // Thenable rather than async, because `fillDeck` chains `.limit(1)`
          // onto its emptiness check and most other callers await directly.
          where: (condition: unknown) => Object.assign(
            Promise.resolve(rowsFor(condition)),
            {
              limit: async (n: number) => rowsFor(condition).slice(0, n),
              // The stub does not sort, so an ordered read hands back the rows in
              // the order the test listed them.
              orderBy: () => ({ limit: async (n: number) => rowsFor(condition).slice(0, n) }),
            },
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
        // `onConflictDoNothing()` is awaited by some callers and read back with
        // `.returning()` by the ones whose touch stamp depends on whether the
        // insert actually wrote — so the fake has to be both, the way Drizzle's
        // builder is. `deck_cards` reports the rows it was handed: this stub
        // has no conflict state, so "wrote" means "was asked to write".
        const conflictResult = () => {
          const rows = tableName === "deck_cards"
            ? (state.insertConflictWrites ? (Array.isArray(values) ? values : [values]) : [])
            : returning;
          return Object.assign(Promise.resolve(rows), { returning: async () => rows });
        };
        return {
          returning: async () => returning,
          onConflictDoUpdate: async () => {},
          onConflictDoNothing: conflictResult,
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
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: () => {
          state.updateCalls.push({ table: nameOf(table), values });
          return Object.assign(
            Promise.resolve(undefined),
            { returning: async () => state.updateReturning },
          );
        },
      }),
    }),
    // `{ rows: [] }`, not `undefined`: that is the shape the driver returns, and
    // readers destructure it. `proxiedOracleIds` fails CLOSED on the pull path,
    // so a stub that throws here refuses every pull rather than testing one.
    execute: async (query?: unknown) => {
      // NOT `JSON.stringify` of the chunks: drizzle's table objects are
      // circular and stringifying one throws inside the stub, which surfaces as
      // an unrelated failure in whatever action ran the query.
      const text = sqlText(query);
      state.executeTexts.push(text);
      if (state.executeError && (!state.executeErrorMatch || text.includes(state.executeErrorMatch))) {
        throw state.executeError;
      }
      return { rows: state.executeRows ?? [] };
    },
    // Table-aware, because `recordFillPass` reads the highest ordinal the deck
    // has used and would otherwise be handed deck card rows. That read is an
    // aggregate, so it always returns exactly one row.
    select: () => ({
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const rows = (condition?: unknown) => {
          if (tableName === "fill_passes") {
            return [{ highest: state.fillPasses.reduce((n, p) => Math.max(n, p.ordinal), 0) }];
          }
          if (tableName === "decks") return state.decks;
          // The commit reads type lines to keep basics off the buy list.
          if (tableName === "cards") return state.cards;
          // An aggregate, so always exactly one row.
          if (tableName === "deck_unresolved_rows") return [{ n: state.unresolvedRows }];
          // Which deck's draft, off the bound `deck_id`, so a pull can be given
          // two lists that differ. Unset decks share `deckRows`.
          for (const id of paramValues(condition)) {
            const own = state.deckRowsByDeck[id];
            if (own) return own as unknown as Record<string, unknown>[];
          }
          return state.deckRows as unknown as Record<string, unknown>[];
        };
        return {
          where: (condition?: unknown) => Object.assign(
            Promise.resolve(rows(condition)),
            {
              limit: async (n: number) => rows(condition).slice(0, n),
              // `for("update")` — the row lock a guard reads under.
              for: async () => rows(condition),
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
    // Raw reads go through here — the proxy readers among them. `{ rows: [] }`
    // is the driver's own shape; returning `undefined` made every pull refuse,
    // because `proxiedOracleIds` fails CLOSED on that path by design.
    execute: async (query?: unknown) => {
      // `sqlText`, not `JSON.stringify`: drizzle's table objects are circular,
      // and this stub is the one the db-level readers go through.
      const text = sqlText(query);
      state.executeTexts.push(text);
      if (state.executeError && (!state.executeErrorMatch || text.includes(state.executeErrorMatch))) {
        throw state.executeError;
      }
      return { rows: state.executeRows ?? [] };
    },
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
// By default the deck's ranked support list holds every card the collection does, so the bulk
// controls' allow-list (`topOffAllowList`) admits the whole pool and a test is about its own
// subject. A test about the allow-list narrows it with `mockResolvedValueOnce`. Mocked at this
// module because the real one reads through `cacheForUser`, which needs a request.
vi.mock("../../lib/decks/deck-synergy", () => ({
  readDeckSynergy: vi.fn(async () => stub.state.collectionItems.map((c) => ({
    oracleId: (c as { oracleId: string }).oracleId, synergyPts: null,
  }))),
}));

// The version module and the claim model are mocked rather than served by the
// stub above. The stub's `where()` returns a thenable carrying only `limit`, so
// it has no `orderBy` for `newestVersion`, and its transaction object has no
// `delete` — `commitVersion` and `restoreDraftFromVersion` both throw inside
// it. Teaching it those shapes would re-test round trips `pnpm probe:claims`
// already proves against a real Postgres. What these tests own is the actions'
// guards, their arithmetic and their revalidation.
// The commit snapshot's two reads. Stubbed rather than run: `cachedDeckProfile` assembles a whole
// profile — 630ms against a real database — and what is under test is whether the snapshot
// REACHES `commitVersion`, which is exactly what shipped broken.
// Pass-through, so every create and retry still reads the stubbed catalog, and a test can ask
// WHICH ids a fill asked the placed cards of.
vi.mock("../../lib/decks/costs-of", async (importActual) => {
  const actual = await importActual<typeof import("../../lib/decks/costs-of")>();
  return { placedCardsOf: vi.fn(actual.placedCardsOf) };
});
// The catalog's basics are a separate read the table stubs here do not model; none by default,
// and a test that needs them sets them.
vi.mock("../../lib/decks/catalog-basics", () => ({ loadCatalogBasics: vi.fn(async () => []) }));
vi.mock("../../lib/profile/load", () => ({ cachedDeckProfile: vi.fn() }));
// The pin after a commit (ruling 2) is a whole analysis; what these tests own is that the commit
// SCHEDULES it, off its own path, for the version it wrote.
vi.mock("../../lib/profile/stored", () => ({ pinAnalysisToVersion: vi.fn() }));
vi.mock("../../lib/synopsis/pin", () => ({ pinSynopsisToVersion: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => stub.state.afters.push(fn) }));
vi.mock("../../lib/bracket/slot", () => ({ slotDeck: vi.fn(() => ({ permits: [1, 2] })) }));

vi.mock("../../lib/decks/versions", () => ({
  newestVersion: vi.fn(),
  versionLiveAt: vi.fn(),
  versionCards: vi.fn(),
  commitVersion: vi.fn(),
  restoreDraftFromVersion: vi.fn(),
  loadVersionDiff: vi.fn(async () => ({ in: [], out: [], newestAsOf: null })),
}));
vi.mock("../../lib/decks/availability-query", () => ({
  loadAvailability: vi.fn(async () => new Map()),
}));
// The release a pull writes. Its SQL, and both claim readers subtracting it, are `probe:claims`'s;
// what the action owns is that a pull writes one for the right pair of decks.
vi.mock("../../lib/decks/pull-release", () => ({
  writePullRelease: vi.fn(),
  releaseAskers: vi.fn(async () => []),
}));
// The asking deck's position after a pull. Mocked rather than driven off the db
// stub because the reader assembles a snapshot transaction, a diff, a claim read
// and a price join — what the action owns is which figures it reports.
vi.mock("../../lib/decks/draft-state", () => ({
  loadDraftState: vi.fn(),
}));

import {
  commitDeckVersion, createDeck, deleteGame, discardDeckDraft, fillDeck, getVersionDiff, logGame,
  pullCardFromDeck, restoreAutoCards, setCardProxied, setCardLocked, chooseBulkFill,
} from "./actions";
import { PROXY_READ_FAILED } from "../../lib/decks/proxies";
import { proxyCopy } from "../../lib/copy/proxies";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import {
  commitVersion, loadVersionDiff, newestVersion, restoreDraftFromVersion, versionCards,
  versionLiveAt,
} from "../../lib/decks/versions";
import { loadAvailability } from "../../lib/decks/availability-query";
import { placedCardsOf } from "../../lib/decks/costs-of";
import { writePullRelease } from "../../lib/decks/pull-release";
import { loadDraftState } from "../../lib/decks/draft-state";
import { deckBodySize } from "../../lib/decks/deck-size";
import type { DraftState } from "../../lib/decks/draft-shape";
import { readDeckSynergy } from "../../lib/decks/deck-synergy";
import { loadCatalogBasics } from "../../lib/decks/catalog-basics";

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
  stub.state.executeError = null;
  stub.state.executeErrorMatch = null;
  stub.state.executeRows = null;
  stub.state.executeTexts = [];
  stub.state.deckRows.length = 0;
  stub.state.updateReturning.length = 0;
  stub.state.fillPasses.length = 0;
  stub.state.edhrecError = null;
  stub.state.redirectTarget = null;
  stub.state.unresolvedRows = 0;
  stub.state.deckVersions.length = 0;
  stub.state.updateCalls.length = 0;
  stub.state.insertConflictWrites = true;
});

/** Whether the act stamped `decks.last_edited_at` — what Home's resume block
    orders on. Read apart from the card writes, because a test that counted the
    two together would pass a card update for a stamp. */
const stamped = () => stub.state.updateCalls.some((u) => u.table === "decks");

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

  // TWO PASSES once the fill reaches the whole body. The seed used to be the whole of what a
  // create wrote, because the fill stopped at the floors and the mana base; filling to 99 in
  // one go would make that a single 99-row pass with nothing to undo but all of it, collapsing
  // a separation the app already ships and already draws. `Undo these 31` has to keep meaning
  // "clear the suggestions, keep the foundation".
  //
  // Written against the LEDGER rather than the rows, because the split is only real if the
  // ledger carries it — the deck_cards rows look identical either way.
  it("records the foundation and the residual as separate passes", async () => {
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(
      // More ramp than the floor wants, so the surplus has nowhere to go but the residual.
      ...Array.from({ length: 30 }, (_, i) => rampCard(i)),
      ...Array.from({ length: 40 }, (_, i) => forestCard(i, 4)),
    );

    await runCreate();

    const passes = stub.state.insertCalls
      .filter((c) => c.table === "fill_passes")
      .map((c) => c.values as Record<string, unknown>);
    expect(passes.map((p) => p.kind)).toEqual(["seed", "top_off"]);
    // Each is ordinal 1 OF ITS OWN KIND — `recordFillPass` counts per deck and per kind, so
    // the residual is "top-off 1" and a later hand top-off is 2.
    expect(passes.every((p) => p.ordinal === 1)).toBe(true);

    // The residual was offered what the foundation left, not the whole body. A ledger line
    // claiming 99 open slots for a pass that was handed 62 would misstate what it did.
    expect(passes[0]!.openSlots).toBe(99);
    expect(passes[1]!.openSlots).toBeLessThan(99);

    // And the split is a real partition: every placed row belongs to exactly one pass.
    const memberCalls = stub.state.insertCalls.filter((c) => c.table === "fill_pass_cards");
    expect(memberCalls).toHaveLength(2);
    const counts = memberCalls.map(
      (c) => (c.values as Array<Record<string, unknown>>).length,
    );
    const placed = stub.state.insertCalls.find((c) => c.table === "deck_cards")!
      .values as Array<Record<string, unknown>>;
    expect(counts[0]! + counts[1]!).toBe(placed.length);
    expect(counts[1]!).toBeGreaterThan(0);
  });

  // THE RETRY PATH GETS THE SAME SPLIT. It runs the identical whole-body `planFill`, so
  // recording it as one seed would make its residual non-undoable separately — the same 99-row
  // pass the create was split to avoid, reachable by pressing the banner's retry instead.
  it("records two passes on the retry path as well", async () => {
    stub.state.decks.push({ id: "deck-2", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    // MORE ramp than the floor wants, so a residual exists at all — the neighbouring case
    // gives exactly ten and therefore records one pass, correctly.
    stub.state.collectionItems.push(
      ...Array.from({ length: 30 }, (_, i) => rampCard(i)),
      ...Array.from({ length: 40 }, (_, i) => forestCard(i, 4)),
    );

    await fillDeck("deck-2");

    const kinds = stub.state.insertCalls
      .filter((c) => c.table === "fill_passes")
      .map((c) => (c.values as Record<string, unknown>).kind);
    expect(kinds).toEqual(["seed", "top_off"]);
  });

  // Gate 6, "fires once": the fill-failed banner's retry is the one path that
  // can run a seed fill against a deck that already exists, so it is the one
  // path that could write a second seed pass.
  // The brief a fill builds to is the app's own words, so a deck the fill placed cards in is
  // born SEEDED, in its creating transaction.
  it("is born with a seeded intent naming the commander when the fill lands rows", async () => {
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));

    await runCreate();

    expect(stub.state.updateCalls).toContainEqual({
      table: "decks",
      values: { intent: "Built around Atraxa, Praetors' Voice, from the cards you own.", intentSeeded: true },
    });
  });

  // A fill that placed nothing built nothing, so there is no brief to disclose — the rule the
  // retry path keeps too.
  it("seeds nothing when the fill lands no rows", async () => {
    stub.state.cards.push(commanderCard());

    await runCreate();

    const seeds = (values: unknown) => (values as { intentSeeded?: boolean }).intentSeeded === true;
    expect(stub.state.insertCalls.some((c) => c.table === "decks" && seeds(c.values))).toBe(false);
    expect(stub.state.updateCalls.some((c) => seeds(c.values))).toBe(false);
  });

  // The retry fills a deck that already exists, where a cleared line cannot be told from one
  // never written — so it seeds nothing, even when it lands rows.
  it("seeds nothing when the failed fill is retried, even when it lands rows", async () => {
    stub.state.decks.push({ id: "deck-1", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));

    await fillDeck("deck-1");

    expect(stub.state.insertCalls.some((c) => c.table === "deck_cards")).toBe(true);
    expect(stub.state.updateCalls.some((c) => (c.values as { intentSeeded?: boolean }).intentSeeded)).toBe(false);
  });

  it("seeds nothing when the retry meets a deck that already holds cards", async () => {
    stub.state.decks.push({ id: "deck-1", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    stub.state.deckRows.push({ oracleId: "ramp-00000000-aaaa-aaaa-aaaa-aaaaaaaaaaaa", quantity: 1 });

    await fillDeck("deck-1");

    expect(stub.state.updateCalls.some((c) => (c.values as { intentSeeded?: boolean }).intentSeeded)).toBe(false);
  });

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

// The stamp on the hand-add path, which is the one a player reaches most often
// and the one whose conditional the probe cannot see: `probe:touched` talks to
// the database directly, and every server action here needs a Clerk session.
describe("addCardToDeck — the touch stamp follows the insert", () => {
  const DECK = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const CARD = "11111111-1111-1111-1111-111111111111";
  const CMDR = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  function ownDeck() {
    stub.state.decks.push({ id: DECK, userId: "user_1", commanderOracleId: CMDR });
    // The card being added FIRST: the stub answers every `cards` read with this
    // whole list, and the add path takes `[card]` off the front while the
    // commander lookup searches it by id.
    stub.state.cards.push(
      { oracleId: CARD, commanderLegal: true, colorIdentity: [], typeLine: "Artifact" },
      { oracleId: CMDR, commanderLegal: true, colorIdentity: ["G"], typeLine: "Legendary Creature" },
    );
  }

  it("stamps the deck when the insert places a card", async () => {
    ownDeck();
    const { addCardToDeck } = await import("./actions");
    expect(await addCardToDeck(DECK, CARD)).toEqual({ ok: true });
    expect(stamped()).toBe(true);
  });

  // The conflict clause decides here. A singleton the deck already holds writes
  // nothing, and a deck nothing was added to was not edited — so a stamp would
  // move this deck up Home's list for an act that changed none of it.
  it("does not stamp when the conflict clause writes nothing", async () => {
    ownDeck();
    stub.state.insertConflictWrites = false;
    const { addCardToDeck } = await import("./actions");
    expect(await addCardToDeck(DECK, CARD)).toEqual({ ok: true });
    expect(stamped()).toBe(false);
  });
  // A concurrent add can land between the read for an existing row and this insert. The request
  // wrote nothing, so it must say `held`: Fits your decks stamps `in the draft` only on `added`.
  it("reports held, not added, when the conflict clause swallowed the insert", async () => {
    ownDeck();
    stub.state.insertConflictWrites = false;
    const { addCardToDeckFor } = await import("../../lib/decks/add-card");
    expect((await addCardToDeckFor("user_1", DECK, CARD, { relock: false })).wrote).toBe("held");
    stub.state.insertConflictWrites = true;
    expect((await addCardToDeckFor("user_1", DECK, CARD, { relock: false })).wrote).toBe("added");
  });
});

// L1 (D2): Put back passes `relock`, which wakes the card's dormant lock inside the add's own
// transaction. The ORDER against the insert, and what the trigger does, are facts about Postgres,
// and `probe:review-locks` reads them back; this pins who may wake one.
describe("addCardToDeck — relock wakes a dormant lock, and only on request", () => {
  const DECK = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const CARD = "11111111-1111-1111-1111-111111111111";
  const CMDR = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const was = process.env.NEVER_CUT_ENABLED;
  const revived = () => stub.state.executeTexts.join(" ").includes("update deck_locks");

  beforeEach(() => {
    stub.state.decks.push({ id: DECK, userId: "user_1", commanderOracleId: CMDR });
    stub.state.cards.push(
      { oracleId: CARD, commanderLegal: true, colorIdentity: [], typeLine: "Artifact" },
      { oracleId: CMDR, commanderLegal: true, colorIdentity: ["G"], typeLine: "Legendary Creature" },
    );
    process.env.NEVER_CUT_ENABLED = "true";
  });
  afterEach(() => {
    if (was === undefined) delete process.env.NEVER_CUT_ENABLED;
    else process.env.NEVER_CUT_ENABLED = was;
  });

  it("wakes it when asked, with the switch on", async () => {
    const { addCardToDeck } = await import("./actions");
    expect(await addCardToDeck(DECK, CARD, { relock: true })).toEqual({ ok: true });
    expect(revived()).toBe(true);
  });

  it("wakes nothing for a plain add: every other return comes back unlocked", async () => {
    const { addCardToDeck } = await import("./actions");
    await addCardToDeck(DECK, CARD);
    expect(revived()).toBe(false);
  });

  it("wakes nothing with the switch off, or for anything but the literal true", async () => {
    const { addCardToDeck } = await import("./actions");
    await addCardToDeck(DECK, CARD, { relock: "true" } as never);
    expect(revived()).toBe(false);
    delete process.env.NEVER_CUT_ENABLED;
    await addCardToDeck(DECK, CARD, { relock: true });
    expect(revived()).toBe(false);
  });
});

// The removal's stamp. The add's two cases are above; this is the other half of
// the pair a player reaches by hand, and the one whose guard is a read of the
// row rather than a conflict clause.
describe("removeCardFromDeck — the touch stamp follows the removal", () => {
  const DECK = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const CARD = "11111111-1111-1111-1111-111111111111";
  const CMDR = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  function ownDeck() {
    stub.state.decks.push({ id: DECK, userId: "user_1", commanderOracleId: CMDR });
  }

  it("stamps the deck when a copy comes out", async () => {
    ownDeck();
    stub.state.deckRows.push({ oracleId: CARD, quantity: 1 });
    const { removeCardFromDeck } = await import("./actions");
    await removeCardFromDeck(DECK, CARD);
    expect(stamped()).toBe(true);
  });

  // The row this removal named is not there — another tab took it, or the
  // reader clicked twice. Nothing was written, so nothing was edited.
  it("does not stamp when the row is already gone", async () => {
    ownDeck();
    const { removeCardFromDeck } = await import("./actions");
    await removeCardFromDeck(DECK, CARD);
    expect(stamped()).toBe(false);
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

  // The note. A form's `maxlength` is a courtesy; the action is the boundary,
  // because a server action is a public endpoint and the column's check would
  // otherwise turn a long note into a generic failure with no explanation.
  it("stores a note as it was written, minus the edges", async () => {
    await logGame("deck_1", {
      result: "loss", podSize: 4, worked: [], hurt: [],
      note: "  Kept a two-lander and never found the third.  ",
    });
    const [game] = stub.state.insertCalls.filter((c) => c.table === "deck_games");
    expect(game.values).toMatchObject({ note: "Kept a two-lander and never found the third." });
  });

  // Blank is null, never an empty string, so "has a note" is one predicate
  // everywhere rather than two that can disagree.
  it.each(["", "   ", undefined])("stores %o as no note at all", async (note) => {
    await logGame("deck_1", { result: "win", podSize: 4, worked: [], hurt: [], note });
    const [game] = stub.state.insertCalls.filter((c) => c.table === "deck_games");
    expect(game.values).toMatchObject({ note: null });
  });

  // Refused rather than truncated: silently storing less than somebody typed
  // is the one outcome worse than saying no.
  it("refuses a note past the cap instead of cutting it down", async () => {
    const result = await logGame("deck_1", {
      result: "win", podSize: 4, worked: [], hurt: [], note: "x".repeat(141),
    });
    expect(result.ok).toBe(false);
    expect(stub.state.insertCalls.filter((c) => c.table === "deck_games")).toHaveLength(0);
  });

  // The column counts code points; JavaScript counts UTF-16 code units. 71
  // emoji is 142 of one and 71 of the other, and refusing it here would refuse
  // a note the database was happy to store.
  it("counts characters the way the column does", async () => {
    const result = await logGame("deck_1", {
      result: "win", podSize: 4, worked: [], hurt: [], note: "😀".repeat(71),
    });
    expect(result).toEqual({ ok: true });
  });

  it("refuses a note that is not a string", async () => {
    const result = await logGame("deck_1", {
      result: "win", podSize: 4, worked: [], hurt: [],
      note: { toString: () => "x" } as unknown as string,
    });
    expect(result.ok).toBe(false);
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
  // surfaces must not be revalidated. The version rail is in the set because a
  // logged game moves the games-held tally it draws against a past version.
  it("revalidates only the deck surfaces", async () => {
    await logGame("deck_1", { result: "draw", podSize: 3, worked: [], hurt: [] });
    expect(stub.state.revalidated).toEqual([
      "/decks/deck_1",
      "/decks",
      "/",
    ]);
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
    expect(stub.state.revalidated).toEqual([
      "/decks/deck_1",
      "/decks",
      "/",
    ]);
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

const { cachedDeckProfile } = await import("../../lib/profile/load");
const { pinAnalysisToVersion } = await import("../../lib/profile/stored");
const { pinSynopsisToVersion } = await import("../../lib/synopsis/pin");
const { slotDeck } = await import("../../lib/bracket/slot");

describe("commitDeckVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub.state.revalidated.length = 0;
    stub.state.deleteCalls.length = 0;
    stub.state.afters.length = 0;
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

  // THE SNAPSHOT REACHES `commitVersion`, which is the whole defect: that function has taken an
  // optional snapshot since the declaration columns landed and NEITHER production caller passed
  // one — so `declared_bracket` and `permits` were written null on every real commit and the
  // columns shipped dead. Only an injected probe path ever exercised them.
  it("carries the live declaration and the permitted range into the version", async () => {
    stub.state.decks.push({
      id: DECK_ID, userId: USER_ID, commanderOracleId: CMD, declaredBracket: 2,
    });
    vi.mocked(cachedDeckProfile).mockResolvedValue({ brackets: {} } as never);
    await commitDeckVersion(DECK_ID, null);
    expect(commitVersion).toHaveBeenCalledWith(
      DECK_ID, null, expect.anything(), { declared: 2, permits: [1, 2] },
    );
  });

  // RULING 2: the commit pins the analysis to the version it wrote, in `after()` so the reader is
  // not held on a 2.2s analysis, and with the fingerprint of the list it froze so a later edit
  // cannot be pinned to it.
  it("schedules the pin for the version it wrote, off its own path", async () => {
    stub.state.decks.push({
      id: DECK_ID, userId: USER_ID, commanderOracleId: CMD, declaredBracket: null,
    });
    await commitDeckVersion(DECK_ID, null);
    expect(pinAnalysisToVersion).not.toHaveBeenCalled();
    expect(stub.state.afters).toHaveLength(1);
    await stub.state.afters[0]();
    expect(pinAnalysisToVersion).toHaveBeenCalledWith(
      DECK_ID, USER_ID, { versionId: VERSION_ID, list: expect.stringMatching(/^[0-9a-f]{16,}$/) },
    );
    // The synopsis is copied with the same pin, never written (ruling 7).
    expect(pinSynopsisToVersion).toHaveBeenCalledWith(DECK_ID, USER_ID, vi.mocked(pinAnalysisToVersion).mock.calls[0][2]);
  });

  it("schedules no pin when the commit is refused", async () => {
    stub.state.decks.length = 0;
    await commitDeckVersion(DECK_ID, null);
    expect(stub.state.afters).toHaveLength(0);
  });

  // GATED ON HAVING DECLARED ANYTHING. Deriving permits costs a whole profile — 630ms median,
  // 2.2s on the slowest real deck — and a deck with no declaration has nothing to carry, which
  // is every deck until a player answers. The profile must not be built at all.
  it("builds no profile for a deck that has declared nothing", async () => {
    stub.state.decks.push({
      id: DECK_ID, userId: USER_ID, commanderOracleId: CMD, declaredBracket: null,
    });
    await commitDeckVersion(DECK_ID, null);
    expect(cachedDeckProfile).not.toHaveBeenCalled();
    expect(commitVersion).toHaveBeenCalledWith(DECK_ID, null, expect.anything(), undefined);
  });

  // A Server Action's arguments are wire input, so the signature is a claim about
  // the caller and not a guarantee. Without the guard the value reaches
  // `note.trim()` and throws a TypeError, which the action has no result shape for.
  it("refuses a note that is not a string", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    const result = await commitDeckVersion(DECK_ID, 7 as unknown as string);
    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(commitVersion).not.toHaveBeenCalled();
  });

  it("commits with no note when none was given", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    const result = await commitDeckVersion(DECK_ID, undefined as unknown as string);
    expect(result.ok).toBe(true);
    expect(commitVersion).toHaveBeenCalledWith(DECK_ID, null, expect.anything(), undefined);
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

  // The version is written and the receipt is read afterwards, on `db` rather
  // than the transaction — so a claim read that throws costs the player a
  // figure, never the version they asked for. Null is "nobody could say": an
  // empty list here would announce their shopping as finished.
  it("still commits, with no buy list, when the claim read behind the receipt throws", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(loadAvailability).mockRejectedValue(new Error("claim read"));
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok).toBe(true);
    expect(result.ok && result.buy).toBeNull();
    expect(commitVersion).toHaveBeenCalled();
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

  // NOT the other list. The pull side is a physical instruction — take these
  // out of the sleeve — and twelve Islands going down to nine is three cards to
  // take out. What made a basic wrong here was a bare `Island` asserting the
  // deck had lost its Islands; the row carries its `from → to` now, so the
  // figure it prints is the true one.
  it("keeps a basic land on the pull list, with its count", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_B, quantity: 9 });
    stub.state.cards.push({ oracleId: CARD_B, typeLine: "Basic Land — Island" });
    vi.mocked(versionCards).mockResolvedValue([
      { oracleId: CARD_B, quantity: 12 },
      { oracleId: CARD_A, quantity: 1 },
    ]);
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.pull).toEqual([
      { oracleId: CARD_A, from: 1, to: 0 },
      { oracleId: CARD_B, from: 12, to: 9 },
    ]);
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

  // The first version is the one commit with an eligibility test of its own, and
  // `?commit=1` is a URL: a stale or hand-typed link reaches the sheet on a deck
  // that is not a whole list, so the server owns the test.
  it("freezes a first version on a list that is exactly its body size", async () => {
    // `partnerOracleId` explicitly null: the expected body size is a card
    // smaller for a partner pair, so a row that leaves the column off asks for
    // 98 and the test would be measuring the wrong deck.
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD, partnerOracleId: null });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: deckBodySize(false) });
    vi.mocked(newestVersion).mockResolvedValue(null);
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok).toBe(true);
    expect(commitVersion).toHaveBeenCalled();
    // A first version buys nothing: every add is a card the player already holds
    // in this brew, and the claim model reads the brew's own rows as the claim.
    expect(result.ok && result.buy).toEqual([]);
  });

  it("refuses a first version on a list short of its body size", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD, partnerOracleId: null });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 63 });
    vi.mocked(newestVersion).mockResolvedValue(null);
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain(String(deckBodySize(false)));
    expect(commitVersion).not.toHaveBeenCalled();
  });

  // Unresolved lines are not `deck_cards` rows, so the count above never sees
  // them: a deck at its body size plus two unnamed lines is a list the player
  // has not finished, and the version would drop them without a word.
  it("refuses a first version while any line is unresolved", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD, partnerOracleId: null });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: deckBodySize(false) });
    stub.state.unresolvedRows = 2;
    vi.mocked(newestVersion).mockResolvedValue(null);
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok).toBe(false);
    expect(commitVersion).not.toHaveBeenCalled();
  });

  // A later commit carries no size test at all: the deck has a version to fall
  // back to, and a draft mid-edit is what this feature exists to let a player
  // commit. Without this the guard above could be widened to every commit and
  // the suite would stay green.
  it("commits a later version on a list that is not a whole deck", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 63 });
    stub.state.unresolvedRows = 2;
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok).toBe(true);
  });

  // An empty note is not a note. Storing "" would render a blank line in the
  // history where the player wrote nothing.
  it("stores a whitespace-only note as null", async () => {
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    await commitDeckVersion(DECK_ID, "   ");
    // The third argument is the caller's transaction: the diff behind the
    // receipt and the snapshot it describes are read under one lock.
    expect(commitVersion).toHaveBeenCalledWith(DECK_ID, null, expect.anything(), undefined);
  });
});

describe("discardDeckDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub.state.revalidated.length = 0;
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
    vi.mocked(restoreDraftFromVersion).mockResolvedValue("restored");
  });

  // A discard puts back every card this draft's pulls took, so each deck a copy was pulled for
  // is short again and its buy tag has to come back.
  it("revalidates every deck this draft's pulls were for", async () => {
    const ASKER = "66666666-6666-4666-8666-666666666666";
    vi.mocked(restoreDraftFromVersion).mockImplementation(async (_d, _v, onReleased) => {
      onReleased?.([ASKER]);
      return "restored";
    });
    const result = await discardDeckDraft(DECK_ID, VERSION_ID);
    expect(result.ok).toBe(true);
    expect(stub.state.revalidated).toContain(`/decks/${ASKER}`);
  });


  it("restores the version the caller named and revalidates", async () => {
    const result = await discardDeckDraft(DECK_ID, VERSION_ID);
    expect(result.ok).toBe(true);
    expect(restoreDraftFromVersion).toHaveBeenCalledWith(DECK_ID, VERSION_ID, expect.any(Function));
    expect(stub.state.revalidated).toContain(`/decks/${DECK_ID}`);
  });

  // The restore decides this under its own lock — a brew, or a commit from
  // another tab, both come back "moved". What is asserted here is that the
  // action reports the refusal rather than claiming a discard, and revalidates
  // anyway: whatever the player is looking at is out of date either way.
  it("says nothing changed when the restore refuses", async () => {
    vi.mocked(restoreDraftFromVersion).mockResolvedValue("moved");
    const result = await discardDeckDraft(DECK_ID, VERSION_ID);
    expect(result.ok).toBe(false);
    expect(stub.state.revalidated).toContain(`/decks/${DECK_ID}`);
  });

  it("refuses a version id that is not a uuid without touching the database", async () => {
    const result = await discardDeckDraft(DECK_ID, "nope");
    expect(result.ok).toBe(false);
    expect(restoreDraftFromVersion).not.toHaveBeenCalled();
  });
});

describe("setCardProxied", () => {
  beforeEach(() => { stub.state.decks = [OWNED_DECK]; });

  it("refuses a card the deck does not hold", async () => {
    // Deck ownership alone is not enough: without the membership check any
    // oracle id at all can be posted and a row written for a card this deck has
    // never held. `execute` returns no rows here, so `held` is false.
    const result = await setCardProxied(DECK_ID, CARD_A, true);
    expect(result).toEqual({ ok: false, message: proxyCopy.error.notInDeck });
  });

  it("refuses an id that is not a uuid without touching the database", async () => {
    const result = await setCardProxied(DECK_ID, "not-a-uuid", true);
    expect(result).toEqual({ ok: false, message: proxyCopy.error.refused });
  });

  it("takes the deck row's lock before it validates", async () => {
    stub.state.executeRows = [{ held: true }];
    await setCardProxied(DECK_ID, CARD_A, true);
    stub.state.executeRows = null;
    // The pair being serialised is this write against a concurrent removal,
    // which deletes the card and prunes: unlocked, a mark can validate, wait,
    // and insert after that prune, leaving the orphan the prune exists to stop.
    const texts = stub.state.executeTexts;
    const lock = texts.findIndex((t) => t.includes("for update"));
    const check = texts.findIndex((t) => t.includes("deck_cards"));
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(lock).toBeLessThan(check);
  });

  it("marks, idempotently", async () => {
    // The marking branch had no assertion of its own: the only `true` case
    // checked lock ordering. Without this, removing the insert — or its
    // `on conflict` clause, which is what makes a second press of a control the
    // reader can already see harmless rather than an error — stayed green.
    stub.state.executeRows = [{ held: true }];
    const result = await setCardProxied(DECK_ID, CARD_A, true);
    const texts = stub.state.executeTexts.join(" ");
    stub.state.executeRows = null;
    expect(result).toEqual({ ok: true });
    expect(texts).toContain("insert into deck_proxies");
    expect(texts).toContain("on conflict (deck_id, oracle_id) do nothing");
    expect(texts).not.toContain("delete from deck_proxies");
  });

  it("unmarks, and says so", async () => {
    // Every other success case passes `true`. A regression that stopped deleting
    // the row — or stopped revalidating after an unmark — would stay green
    // without this, because the probe writes `deck_proxies` directly rather than
    // through the action.
    stub.state.executeRows = [{ held: true }];
    const result = await setCardProxied(DECK_ID, CARD_A, false);
    const texts = stub.state.executeTexts.join(" ");
    stub.state.executeRows = null;
    expect(result).toEqual({ ok: true });
    expect(texts).toContain("delete from deck_proxies");
    expect(texts).not.toContain("insert into deck_proxies");
    expect(stub.state.revalidated).toContain("/collection/proxies");
  });

  it("refuses a non-boolean flag before touching the database", async () => {
    // Wire input: the string "false" is truthy, so an unvalidated call marks the
    // card the reader was unmarking.
    const result = await setCardProxied(DECK_ID, CARD_A, "false" as unknown as boolean);
    expect(result).toEqual({ ok: false, message: proxyCopy.error.refused });
    expect(stub.state.executeTexts.join(" ")).not.toContain("deck_proxies");
  });

  it("does not stamp the deck as edited", async () => {
    stub.state.executeRows = [{ held: true }];
    await setCardProxied(DECK_ID, CARD_A, true);
    stub.state.executeRows = null;
    // `last_edited_at` means "this deck's list was edited". A proxy edits no
    // list, and stamping would reorder Home's resume block for a decision that
    // changed nothing about what is in the deck.
    expect(stub.state.updateCalls.map((c) => c.table)).not.toContain("decks");
  });
});


describe("setCardLocked", () => {
  const was = process.env.NEVER_CUT_ENABLED;
  beforeEach(() => {
    stub.state.decks = [OWNED_DECK];
    stub.state.revalidated.length = 0;
    stub.state.afters.length = 0;
    process.env.NEVER_CUT_ENABLED = "true";
  });
  afterEach(() => {
    if (was === undefined) delete process.env.NEVER_CUT_ENABLED;
    else process.env.NEVER_CUT_ENABLED = was;
  });

  it("refuses with the switch off, before touching the database (D3)", async () => {
    delete process.env.NEVER_CUT_ENABLED;
    stub.state.executeRows = [{ held: true }];
    const result = await setCardLocked(DECK_ID, CARD_A, true);
    stub.state.executeRows = null;
    expect(result).toEqual({ ok: false, message: lockedCardsCopy.mode.refused });
    expect(stub.state.executeTexts.join(" ")).not.toContain("deck_locks");
  });

  it("refuses a card the deck does not hold", async () => {
    const result = await setCardLocked(DECK_ID, CARD_A, true);
    expect(result).toEqual({ ok: false, message: lockedCardsCopy.mode.refused });
    expect(stub.state.executeTexts.join(" ")).not.toContain("insert into deck_locks");
  });

  it("asks deck_cards alone for membership: a commander is never offered a lock", async () => {
    stub.state.executeRows = [{ held: true }];
    await setCardLocked(DECK_ID, CARD_A, true);
    stub.state.executeRows = null;
    const check = stub.state.executeTexts.find((t) => t.includes("as held"))!;
    expect(check).toContain("deck_cards");
    expect(check).not.toContain("commander_oracle_id");
  });

  it("refuses a bad id or a non-boolean flag without touching the database", async () => {
    expect(await setCardLocked(DECK_ID, "not-a-uuid", true)).toEqual({ ok: false, message: lockedCardsCopy.mode.refused });
    expect(await setCardLocked(DECK_ID, CARD_A, "false" as unknown as boolean)).toEqual({ ok: false, message: lockedCardsCopy.mode.refused });
    expect(stub.state.executeTexts.join(" ")).not.toContain("deck_locks");
  });

  it("takes the deck row's lock before it validates", async () => {
    stub.state.executeRows = [{ held: true }];
    await setCardLocked(DECK_ID, CARD_A, true);
    stub.state.executeRows = null;
    const texts = stub.state.executeTexts;
    const lock = texts.findIndex((t) => t.includes("for update"));
    const check = texts.findIndex((t) => t.includes("as held"));
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(lock).toBeLessThan(check);
  });

  it("locks by an upsert that wakes a dormant row, so a stray one never swallows a lock", async () => {
    stub.state.executeRows = [{ held: true }];
    const result = await setCardLocked(DECK_ID, CARD_A, true);
    const texts = stub.state.executeTexts.join(" ");
    stub.state.executeRows = null;
    expect(result).toEqual({ ok: true });
    expect(texts).toContain("insert into deck_locks");
    expect(texts).toContain("do update set removed_at = null");
    expect(texts).not.toContain("delete from deck_locks");
  });

  it("unlocks by deleting the row", async () => {
    stub.state.executeRows = [{ held: true }];
    const result = await setCardLocked(DECK_ID, CARD_A, false);
    const texts = stub.state.executeTexts.join(" ");
    stub.state.executeRows = null;
    expect(result).toEqual({ ok: true });
    expect(texts).toContain("delete from deck_locks");
    expect(texts).not.toContain("insert into deck_locks");
  });

  it("revalidates only in after(), and never stamps the deck as edited (D5, D7)", async () => {
    stub.state.executeRows = [{ held: true }];
    await setCardLocked(DECK_ID, CARD_A, true);
    stub.state.executeRows = null;
    expect(stub.state.revalidated).toEqual([]);
    expect(stub.state.updateCalls.map((c) => c.table)).not.toContain("decks");
    for (const fn of stub.state.afters) fn();
    expect(stub.state.revalidated).toContain(`/decks/${DECK_ID}`);
    expect(stub.state.revalidated).toContain("/decks/[id]/changes");
  });
});

describe("getVersionDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadVersionDiff).mockResolvedValue({ in: [], out: [], newestAsOf: null });
    stub.state.decks.push({ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD });
  });

  it("refuses an id that is not a uuid without reading a diff", async () => {
    expect(await getVersionDiff(DECK_ID, "not-a-uuid")).toBeNull();
    expect(loadVersionDiff).not.toHaveBeenCalled();
  });

  // `loadVersionDiff` reads by version id alone, so without this check a signed-in
  // account could read another player's list by posting their version id alongside
  // a deck of its own. Null rather than two empty lists, because two empty lists
  // are a real answer for a version that moved no cards, and the caller caches
  // what it is given.
  it("refuses a version that is not this deck's", async () => {
    // A real version, filed under another deck — not an absent row. An empty
    // table would pass this test against a guard that only checked existence.
    stub.state.deckVersions.push({
      id: VERSION_ID,
      number: 2,
      deckId: "99999999-9999-4999-8999-999999999999",
    });
    expect(await getVersionDiff(DECK_ID, VERSION_ID)).toBeNull();
    expect(loadVersionDiff).not.toHaveBeenCalled();
  });

  // The predecessor is not a parameter: the action reads it, so no caller can ask
  // for v7 against v2 and get a payload drawn under the words "what v7 changed".
  // Three versions, so the read has a wrong answer available to it: the asked-for
  // version itself, and the one two behind.
  it("reads the predecessor itself rather than taking one from the caller", async () => {
    const V1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const V2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    stub.state.deckVersions.push(
      { id: V1, number: 1, deckId: DECK_ID },
      { id: V2, number: 2, deckId: DECK_ID },
      { id: VERSION_ID, number: 3, deckId: DECK_ID },
    );
    await getVersionDiff(DECK_ID, VERSION_ID);
    expect(loadVersionDiff).toHaveBeenCalledTimes(1);
    expect(vi.mocked(loadVersionDiff).mock.calls[0]).toEqual([VERSION_ID, V2, USER_ID]);
  });

  // A v1 has nothing before it, and the diff loader is told so explicitly rather
  // than being handed some other version's id.
  it("names no predecessor for the first version", async () => {
    stub.state.deckVersions.push({ id: VERSION_ID, number: 1, deckId: DECK_ID });
    await getVersionDiff(DECK_ID, VERSION_ID);
    expect(vi.mocked(loadVersionDiff).mock.calls[0]).toEqual([VERSION_ID, null, USER_ID]);
  });
});

describe("pullCardFromDeck", () => {
  const SOURCE_ID = "55555555-5555-4555-8555-555555555555";
  const ASKING_ID = "66666666-6666-4666-8666-666666666666";

  beforeEach(() => {
    vi.clearAllMocks();
    stub.state.revalidated.length = 0;
    stub.state.deleteCalls.length = 0;
    stub.state.deckRowsByDeck = {};
    // BOTH decks: a pull calls requireDeck on the asking deck as well as the
    // source. The stub ignores the where clause, so leaving the asking deck
    // out passes by accident and would stop meaning anything the day it stops.
    stub.state.decks.push(
      { id: SOURCE_ID, userId: USER_ID, commanderOracleId: CMD },
      { id: ASKING_ID, userId: USER_ID, commanderOracleId: CMD },
    );
    // Per deck, because the action reads both decks' versions in one transaction.
    // The asking deck is a brew by default, which makes its whole draft a list of
    // adds — the shortest way to give it something to be waiting on.
    vi.mocked(newestVersion).mockImplementation(async (deckId) =>
      deckId === ASKING_ID ? null : aVersion());
    vi.mocked(commitVersion).mockResolvedValue({ version: { ...aVersion(), number: 2 }, cardCount: 0 });
    vi.mocked(loadDraftState).mockResolvedValue(askingDraft());
    vi.mocked(loadAvailability).mockResolvedValue(claimedBySource());
  });

  /** The asking deck's position after the pull: what it still owes, and what
   *  that costs. Read once, after the write, for the figures the control
   *  prints — the authorization no longer comes from here.
   *
   *  `version` is set, because only a deck with one has a purchase figure to
   *  quote. This mock is independent of the version reads the transaction makes:
   *  those decide whether the pull is allowed, this decides what is reported
   *  about it, and the brew's answer has its own test below. */
  function askingDraft() {
    return { version: aVersion(), buyCount: 7, total: "$241.00", claimsKnown: true } as DraftState;
  }

  /** Both movable cards owned, both entirely spoken for, and the source deck is
   *  the deck holding them. This is the claim shape a pull is offered against;
   *  without it there is nothing in anybody's box to take.
   *
   *  `free` is −1 from the asking deck's vantage: one copy owned, sleeved senior
   *  in the source deck, and this deck's own draft asking for it. A figure of 0
   *  would say the collection covers the ask, and the pull would be refused as
   *  unnecessary. */
  function claimedBySource() {
    const claim = { id: SOURCE_ID, name: "Source deck", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    return new Map([CARD_A, CARD_B].map((oracleId) => [
      oracleId,
      { owned: 1, hard: 1, soft: 0, free: -1, claims: [claim] },
    ])) as unknown as Awaited<ReturnType<typeof loadAvailability>>;
  }

  // Ownership proves the player may touch both decks, not that the app ever
  // offered this pull. Otherwise any two owned decks can be named and the source
  // made to lose a card nothing asked for.
  it("refuses a card the asking deck is not waiting on", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    // Both decks sleeved with exactly this list: the source holds the card, and
    // the asking deck's draft matches its version, so it is waiting on nothing.
    vi.mocked(newestVersion).mockResolvedValue(aVersion());
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(commitVersion).not.toHaveBeenCalled();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // The race the in-transaction claim read exists for. The reader was offered a
  // pull, and by the time they took it the copy was free — another deck released
  // it, or their own earlier pull already landed. Releasing a second copy here
  // would empty a box for a deck that no longer needs anything.
  it("refuses when the copy has come free since the page was drawn", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    vi.mocked(loadAvailability).mockResolvedValue(
      new Map([[CARD_A, { owned: 1, hard: 0, soft: 0, free: 0, claims: [] }]]),
    );
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(false);
    expect(commitVersion).not.toHaveBeenCalled();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // The claim is what authorizes the pull, and it is made of decks this
  // transaction does not otherwise touch. Those decks' rows are locked from a
  // read taken before the transaction, so a claimant that joined since is locked
  // by nothing — and authorizing a destructive write against half an unlocked
  // claim is exactly the race the locks exist to close. Refuse instead.
  it("refuses when a deck outside the locked set has joined the claim", async () => {
    const THIRD_ID = "77777777-7777-4777-8777-777777777777";
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    // First call is the pre-transaction read that chooses the lock set; the
    // second is the authorization, taken under those locks.
    vi.mocked(loadAvailability)
      .mockResolvedValueOnce(claimedBySource())
      .mockResolvedValueOnce(
        new Map([[CARD_A, {
          owned: 2, hard: 2, soft: 0, free: -1,
          claims: [
            { id: SOURCE_ID, name: "Source deck", quantity: 1, mature: true, pending: false, commander: false, senior: true },
            { id: THIRD_ID, name: "Latecomer", quantity: 1, mature: true, pending: false, commander: false, senior: true },
          ],
        }]]) as unknown as Awaited<ReturnType<typeof loadAvailability>>,
      );
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(false);
    expect(commitVersion).not.toHaveBeenCalled();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // The proxy read is part of the authorization here, not decoration: a printed
  // add asks the collection for nothing, so no pull is warranted for it. A
  // swallowed failure would read as "no proxies", authorize the pull, and take a
  // copy out of another deck on the strength of a query that threw.
  //
  // Same setup as the allowed pull below, so the ONLY difference is the failing
  // read — otherwise this refuses for some earlier reason and proves nothing.
  it("refuses the pull when the proxy read fails", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    stub.state.executeError = new Error("proxy read down");
    stub.state.executeErrorMatch = "deck_proxies";
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    stub.state.executeError = null;
    stub.state.executeErrorMatch = null;
    // The MESSAGE, not just the refusal. Fail open and this pull SUCCEEDS, and a
    // test asserting only `ok === false` would pass over the bug either way.
    expect(result).toEqual({ ok: false, message: PROXY_READ_FAILED });
    expect(commitVersion).not.toHaveBeenCalled();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // The same claimant, named by the read the lock set was chosen from, is locked
  // and the pull goes through. Without this the guard above would be satisfied by
  // refusing every pull whose card any other deck holds — which is every pull.
  it("allows the pull when the whole claim is inside the locked set", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(writePullRelease).toHaveBeenCalled();
  });

  // The bucket check answers for the card, not for the deck this call named. On a
  // card two decks hold — one senior to the asking deck, one junior — the senior
  // claim alone keeps the bucket `claimed`, so a request naming the junior deck
  // would ride in on it and empty a box whose copy was already outside this
  // deck's `free`. The named source has to be releasable itself.
  it("refuses a source whose own claim is junior to the asking deck", async () => {
    const THIRD_ID = "77777777-7777-4777-8777-777777777777";
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    // Both holders are named by both reads, so both are inside the locked set and
    // the unlocked-claimant guard has nothing to say — this refusal is the
    // membership test's alone.
    vi.mocked(loadAvailability).mockResolvedValue(
      new Map([[CARD_A, {
        owned: 2, hard: 2, soft: 0, free: -1,
        claims: [
          { id: SOURCE_ID, name: "Source deck", quantity: 1, mature: true, pending: false, commander: false, senior: false },
          { id: THIRD_ID, name: "Senior deck", quantity: 1, mature: true, pending: false, commander: false, senior: true },
        ],
      }]]) as unknown as Awaited<ReturnType<typeof loadAvailability>>,
    );
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(commitVersion).not.toHaveBeenCalled();
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  // The pre-transaction read only chooses locks, so losing it costs no pull the
  // claim still supports: the set falls back to the two decks in hand, and the
  // authorization refuses only if a third deck turns out to be holding a copy.
  it("still pulls when the read that chooses the lock set throws", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    vi.mocked(loadAvailability)
      .mockRejectedValueOnce(new Error("claim read"))
      .mockResolvedValueOnce(claimedBySource());
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(writePullRelease).toHaveBeenCalled();
  });

  // The claim read has to be the one taken inside the transaction, or it is
  // answering for a moment already past by the time the locks are held.
  it("reads the claim inside the transaction it writes in", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(loadAvailability).toHaveBeenCalledWith(
      USER_ID,
      { oracleIds: [CARD_A], excludeDeckId: ASKING_ID },
      expect.anything(),
    );
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

  // No pending-changes guard (Hugh, 2026-09-27): the pull joins the source's draft rather than
  // committing it, so a draft of its own is nothing to sweep into a version.
  it("pulls from a source with a draft of its own, and commits nothing", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 }, { oracleId: CARD_B, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(commitVersion).not.toHaveBeenCalled();
    expect(writePullRelease).toHaveBeenCalled();
  });

  // The source's draft already cut the card, so only its version still claims the copy: the pull
  // is the release alone, and there is no draft row to delete.
  it("releases a card the source's draft has already cut", async () => {
    stub.state.deckRowsByDeck[SOURCE_ID] = [];
    stub.state.deckRowsByDeck[ASKING_ID] = [{ oracleId: CARD_A, quantity: 1 }];
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    vi.mocked(newestVersion).mockImplementation(async (deckId) =>
      deckId === ASKING_ID ? null : aVersion());
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(stub.state.deleteCalls).not.toContainEqual({ table: "deck_cards", id: SOURCE_ID });
    expect(writePullRelease).toHaveBeenCalled();
  });

  // Otherwise the decrement and the delete both match nothing and the commit
  // writes a version identical to its predecessor — history recording a pull
  // that never happened.
  it("refuses a card the source deck does not hold", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    // The asking deck genuinely wants CARD_B, so the refusal has to come from the
    // source's shelf rather than from the offer check standing in front of it.
    stub.state.deckRowsByDeck[ASKING_ID] = [{ oracleId: CARD_B, quantity: 1 }];
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

  // A commander change pending on the source: its live commander moved away and the card sits in
  // the draft's list, but the VERSION still leads with it. A release subtracts from the version's
  // list claim only, so the pull would empty the draft and cover nothing.
  it("refuses a card the source's version still has as its commander", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([]);
    vi.mocked(newestVersion).mockImplementation(async (deckId) =>
      deckId === ASKING_ID ? null : { ...aVersion(), commanderOracleId: CARD_A });
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: false, message: expect.stringContaining("commander") });
    expect(writePullRelease).not.toHaveBeenCalled();
  });

  // The ruling (Hugh, 2026-09-27): the card leaves the source's DRAFT, no version is cut, and a
  // release for this pair of decks is written in the same transaction, which is what frees the
  // copy for the asking deck before anyone commits the source.
  it("removes the card from the source's draft and writes a release, committing nothing", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(stub.state.deleteCalls).toContainEqual({ table: "deck_cards", id: SOURCE_ID });
    expect(commitVersion).not.toHaveBeenCalled();
    expect(cachedDeckProfile).not.toHaveBeenCalled();
    expect(writePullRelease).toHaveBeenCalledWith(expect.anything(), {
      userId: USER_ID, sourceDeckId: SOURCE_ID, oracleId: CARD_A, askingDeckId: ASKING_ID,
    });
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
    // The only read left is the one describing where the pull left the asking
    // deck: the authorization is the transaction's own claim read now.
    vi.mocked(loadDraftState).mockRejectedValue(new Error("read failed"));
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: true, buy: null, total: null });
  });

  // `claimsKnown` false is the loader's degraded answer, and it reports
  // `buyCount: 0` in that state. Printing that zero would tell a player who just
  // pulled a card that their shopping list is empty — a figure nobody computed.
  it("reports an unknown buy count when the claim read degraded", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    vi.mocked(loadDraftState).mockResolvedValue({
      buyCount: 0,
      total: "$0.00",
      claimsKnown: false,
    } as DraftState);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: true, buy: null, total: null });
  });

  // A versionless asking deck is allowed to take a pull: with no version to diff
  // against, its live rows are all adds. But `loadDraftState` answers for a brew
  // with the bare state, whose `buyCount` is 0 because nothing was measured —
  // printing it would tell a player with a whole brew to buy that they are done.
  it("reports an unknown buy count when the asking deck has no version", async () => {
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    vi.mocked(loadDraftState).mockResolvedValue({
      version: null,
      buyCount: 0,
      total: null,
      claimsKnown: true,
    } as DraftState);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: true, buy: null, total: null });
  });

  // A brew holds nothing hard, so there is no claim to release and no version
  // to commit against.
  it("refuses a source deck that is not sleeved", async () => {
    // Both decks unsleeved, so the asking deck's whole draft is a list of adds and
    // the offer check passes — leaving the source's missing version as the refusal.
    stub.state.deckRows.push({ oracleId: CARD_A, quantity: 1 });
    vi.mocked(newestVersion).mockResolvedValue(null);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(false);
    expect(stub.state.deleteCalls).toHaveLength(0);
  });
});

// TASK 21. The control used to take the top N by SYNERGY from the sleeveable pool — optimising
// "what can I sleeve" where the player asked "what does this deck need". Short on creatures, it
// ticked non-creatures and left the deck worse with no slots left to fix it.
//
// Every candidate here carries REAL oracle text. R1's version gave them none, so neither
// classified, both fell to the residual, and the residual ranks on synergy — which picks the
// card the case was written to see beaten.
describe("chooseBulkFill", () => {
  const creature = (n: number) => ({
    oracleId: `crea-${n.toString().padStart(8, "0")}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
    name: `Elf ${n}`,
    typeLine: "Creature — Elf Druid",
    oracleText: "{T}: Add {G}.",
    keywords: [], colorIdentity: [], commanderLegal: true, quantity: 1,
  });

  it("returns nothing for a deck with no open slots", async () => {
    stub.state.decks.push({ id: "bulk-0", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    const result = await chooseBulkFill("bulk-0", 0);
    expect(result).toEqual({ ok: true, oracleIds: [] });
  });

  // WHAT THIS LEVEL CAN PROVE, and what it cannot.
  //
  // The rule Task 21 is about — take the role the deck is SHORT of, not the one it has already
  // filled — is proved in `fill.test.ts` under `describe("held")`, where `planFill` takes the
  // deck's contents as a plain argument and the counterfactual can be run beside it. It is not
  // provable here: this stub answers a `deck_cards` read with rows it holds for the deck id,
  // and an earlier version of this case claimed the rule while actually discriminating on
  // `byPreference`'s `name.localeCompare` tail — renaming a fixture flipped it.
  //
  // What belongs at this level is the action's own contract: it caps at the slots asked for,
  // it never repeats an id, and it answers rather than throwing.
  it("never offers more than the open slots, and never twice", async () => {
    stub.state.decks.push({ id: "bulk-1", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(
      ...Array.from({ length: 6 }, (_, i) => rampCard(i)),
      ...Array.from({ length: 6 }, (_, i) => creature(i)),
    );

    const result = await chooseBulkFill("bulk-1", 3);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // FEWER IS VALID; MORE NEVER IS. A control that promised three slots and ticked four has
    // taken a decision the player did not make.
    expect(result.oracleIds.length).toBeLessThanOrEqual(3);
    expect(new Set(result.oracleIds).size).toBe(result.oracleIds.length);
  });

  // THE COMMANDER IS NOT COUNTED HERE, and this pins the direction rather than leaving it to
  // whichever round argued last. The measured role targets come from EDHREC's support lists,
  // which never contain the commander — `profile/types.ts` carries a second classification
  // "over the 99 ALONE" for exactly this, with the instruction to use it ONLY against a
  // measured target.
  //
  // Observable because the wipes floor is 3: a wipe commander that closed a unit of it would
  // leave two to fill, and the third slot would come back empty.
  it("does not count the commander toward a measured floor", async () => {
    stub.state.decks.push({ id: "bulk-c", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard({ oracleText: "Destroy all creatures." }));
    stub.state.collectionItems.push(...Array.from({ length: 3 }, (_, i) => ({
      oracleId: `wipe-${i.toString().padStart(8, "0")}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
      name: `Wrath ${i}`, typeLine: "Sorcery", oracleText: "Destroy all creatures.",
      keywords: [], colorIdentity: [], commanderLegal: true, quantity: 1,
    })));

    const result = await chooseBulkFill("bulk-c", 3);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.oracleIds.length).toBe(3);
  });

  // A CLAIMED CARD MUST NOT TAKE A SLOT A FREE ONE COULD FILL. `pool: "sleeveable"` only
  // filters on `owned`, and every row from the owned pool is owned whether or not a copy is
  // free — so a card claimed by another deck closed the floor here and was then stripped
  // client-side, leaving the tick missing and the free card never considered.
  it("plans around a card whose every copy is claimed elsewhere", async () => {
    stub.state.decks.push({ id: "bulk-a", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    const claimed = rampCard(70);
    const free = rampCard(71);
    stub.state.collectionItems.push(claimed, free);
    // BOTH CARDS ARE IN THE MAP. With only the claimed one present the free card passes
    // through the `a === undefined` arm — the "nothing is known about it" case — and the
    // `a.free > 0` branch this exists for is never reached.
    vi.mocked(loadAvailability).mockResolvedValue(new Map([
      [claimed.oracleId as string, { free: 0, claims: [] }],
      [free.oracleId as string, { free: 2, claims: [] }],
    ]) as never);

    const result = await chooseBulkFill("bulk-a", 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.oracleIds).toContain(free.oracleId);
    expect(result.oracleIds).not.toContain(claimed.oracleId);
    // ASKED THE RIGHT QUESTION, not just handed the right answer. The mock ignores its
    // arguments, so without this the deck's own claims could be counted against it and every
    // assertion above would still hold.
    expect(vi.mocked(loadAvailability)).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        excludeDeckId: "bulk-a",
        oracleIds: expect.arrayContaining([free.oracleId, claimed.oracleId]),
      }),
    );
  });

  it("offers only cards the top-off list draws", async () => {
    // The list is the commander's support list; the plan's pool is the whole collection. A plan
    // free to pick from the collection named cards the list has no row for, and the press ticked
    // nothing (Hugh's deck bug batch, item 10). Six ramp cards owned, two on the list.
    stub.state.decks.push({ id: "bulk-l", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 6 }, (_, i) => rampCard(i)));
    const listed = [rampCard(4).oracleId as string, rampCard(5).oracleId as string];
    vi.mocked(readDeckSynergy).mockResolvedValueOnce(
      listed.map((oracleId) => ({ oracleId, synergyPts: null })) as never,
    );

    const result = await chooseBulkFill("bulk-l", 3);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.oracleIds.length).toBeGreaterThan(0);
    expect(result.oracleIds.every((id) => listed.includes(id))).toBe(true);
  });

  it("never offers a catalog basic the top-off list does not draw", async () => {
    // A deck one land short gets one basic, at quantity 1, and the controls answer with ids: past
    // the allow-list that id is a tick the list has no row for. The catalog's basics are not
    // candidates, so they need the allow-list applied to them too.
    stub.state.decks.push({ id: "bulk-b", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    const CAT_FOREST = "cafe0000-0000-4000-8000-000000000f00";
    vi.mocked(loadCatalogBasics).mockResolvedValueOnce([{
      oracleId: CAT_FOREST, name: "Forest", typeLine: "Basic Land — Forest", oracleText: null,
      keywords: [], manaCost: null, layout: "normal", owned: true, ownedQuantity: 0, inclusionPct: null,
    }]);
    vi.mocked(readDeckSynergy).mockResolvedValueOnce([] as never);

    const result = await chooseBulkFill("bulk-b", 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.oracleIds).not.toContain(CAT_FOREST);
  });

  it("never offers a residual card", async () => {
    // `planFill` fills whatever `slots` remain with the next cards by preference once the
    // floors and the mana base are done — right for a CREATE, which owes a whole 99. Here it
    // was the failure this control exists to end: unmeetable floors meant every open slot
    // went to "whatever ranked next", which is the synergy ordering in a different hat. A
    // residual row must never reach the player from this door.
    stub.state.decks.push({ id: "bulk-r", userId: "user_1", commanderOracleId: COMMANDER_ORACLE });
    stub.state.cards.push(commanderCard());
    // Cards that close no floor: vanilla creatures with no ramp, draw, removal or wipe text.
    stub.state.collectionItems.push(...Array.from({ length: 8 }, (_, i) => ({
      oracleId: `vani-${i.toString().padStart(8, "0")}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
      name: `Bear ${i}`, typeLine: "Creature — Bear", oracleText: "",
      keywords: [], colorIdentity: [], commanderLegal: true, quantity: 1,
    })));

    const result = await chooseBulkFill("bulk-r", 4);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Four slots asked for, nothing that closes a floor: the slots stay open.
    expect(result.oracleIds).toEqual([]);
  });

  it("refuses rather than throwing for a deck the reader does not own", async () => {
    // `requireDeck` throws for a deck belonging to someone else, or one deleted while the
    // list was open. It used to sit OUTSIDE the `try`, so that rejection escaped a function
    // documented and tested as answering a refusal — and the click handler had no catch.
    const result = await chooseBulkFill("not-a-deck-of-mine", 3);
    expect(result.ok).toBe(false);
  });

  it("reports a refusal rather than throwing when the fill cannot run", async () => {
    stub.state.decks.push({ id: "bulk-2", userId: "user_1", commanderOracleId: "missing-oracle" });
    const result = await chooseBulkFill("bulk-2", 5);
    expect(result.ok).toBe(false);
  });
});

describe("createDeck — Help me choose's answers (F1, F2)", () => {
  // Bracket 4 states no limits and no budget is asked, so no gate reads the database: what is
  // proved here is what the create WRITES, and the gates themselves are `fill-gate.test.ts`'s.
  const answers = { themes: ["Superfriends"], cardOracleId: null, budgetDollars: null, bracket: 4 };
  const runAsked = async (a: Parameters<typeof createDeck>[4]) => {
    try {
      await createDeck(COMMANDER_ORACLE, "My Deck", [], null, a);
    } catch (err) {
      if (!(err as { __nextRedirect?: boolean }).__nextRedirect) throw err;
    }
  };

  it("stores the answers on the deck and writes them as the brief, in the insert", async () => {
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));

    await runAsked(answers);

    const insert = stub.state.insertCalls.find((c) => c.table === "decks")!;
    expect(insert.values).toMatchObject({
      answerBracket: 4, answerBudgetCents: null, answerCardOracleId: null,
      intent: "Built around Atraxa, Praetors' Voice: Superfriends, bracket 4.", intentSeeded: true,
    });
    // The fill's own brief is not written over the answers.
    expect(stub.state.updateCalls.some((c) => (c.values as { intent?: string }).intent?.includes("from the cards you own"))).toBe(false);
  });

  it("places the build-around card first, whatever order the catalog read returns", async () => {
    const picked = { ...rampCard(1), oracleId: "0000aaaa-0000-4000-8000-000000000001" };
    const around = { ...rampCard(2), oracleId: "0000bbbb-0000-4000-8000-000000000002" };
    // The picked card comes back first from an unordered read; the build-around must still lead.
    stub.state.cards.push(commanderCard(), picked, around);
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i + 10)));

    try {
      await createDeck(COMMANDER_ORACLE, "My Deck", [picked.oracleId], null, { ...answers, cardOracleId: around.oracleId });
    } catch (err) {
      if (!(err as { __nextRedirect?: boolean }).__nextRedirect) throw err;
    }

    const placed = stub.state.insertCalls.filter((c) => c.table === "deck_cards")
      .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]) as { oracleId: string }[]);
    expect(placed[0].oracleId).toBe(around.oracleId);
  });

  it("drops a basic land named as the build-around card: neither stored nor placed", async () => {
    // A uuid-shaped id, so the selection's shape filter cannot be what drops it.
    const basic = { ...forestCard(1), oracleId: "0000f0e5-0000-4000-8000-000000000001" };
    stub.state.cards.push(commanderCard(), basic);
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));

    await runAsked({ ...answers, cardOracleId: basic.oracleId });

    const insert = stub.state.insertCalls.find((c) => c.table === "decks")!;
    expect(insert.values).toMatchObject({ answerCardOracleId: null });
    const placed = stub.state.insertCalls.filter((c) => c.table === "deck_cards")
      .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]) as { oracleId: string }[]);
    expect(placed.some((r) => r.oracleId === basic.oracleId)).toBe(false);
  });

  it("keeps the answers on the empty deck a failed fill leaves, so the retry fills to them", async () => {
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));
    stub.state.transactionError = new Error("transaction failed");

    await runAsked(answers);

    const inserts = stub.state.insertCalls.filter((c) => c.table === "decks");
    expect(inserts[inserts.length - 1].values).toMatchObject({ filled: false, answerBracket: 4, intentSeeded: true });
  });

  it("retries a failed fill to the stored answers: the build-around card first, and the body whole", async () => {
    stub.state.decks.push({
      id: "deck-2", userId: "user_1", commanderOracleId: COMMANDER_ORACLE,
      answerCardOracleId: "card-build-around", answerBracket: 4, answerBudgetCents: null,
    });
    stub.state.cards.push(commanderCard());
    // Enough for the plan to fill the whole body by itself, which is what put a stored card at 100.
    stub.state.collectionItems.push(
      ...Array.from({ length: 120 }, (_, i) => rampCard(i)),
      ...Array.from({ length: 40 }, (_, i) => forestCard(i, 4)),
    );

    await fillDeck("deck-2");

    const inserted = stub.state.insertCalls
      .filter((c) => c.table === "deck_cards")
      .flatMap((c) => c.values as { oracleId: string; quantity: number }[]);
    // The card is placed first; the cap on the body is `capToBody`'s, pinned in fill.test.ts.
    expect(inserted[0].oracleId).toBe("card-build-around");
    expect(inserted.reduce((n, r) => n + r.quantity, 0)).toBeLessThanOrEqual(99);
  });

  it("retries with the build-around card placed beside the plan, as the create had it", async () => {
    // The card is placed beside the plan and excluded from its pool, so the plan sees it only
    // through `selected`. The retry left it out, and a retried create could split the basics
    // differently from the create it replays.
    stub.state.decks.push({
      id: "deck-4", userId: "user_1", commanderOracleId: COMMANDER_ORACLE,
      answerCardOracleId: "card-build-around", answerBracket: 4, answerBudgetCents: null,
    });
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));
    vi.mocked(placedCardsOf).mockClear();

    await fillDeck("deck-4");

    expect(vi.mocked(placedCardsOf).mock.calls.map((c) => [...c[0]])).toContainEqual(["card-build-around"]);
  });

  it("retries an own-only deck from free copies alone, and fails closed when the claim read does", async () => {
    stub.state.decks.push({ id: "deck-3", userId: "user_1", commanderOracleId: COMMANDER_ORACLE, answerOwnedOnly: true });
    stub.state.cards.push(commanderCard());
    stub.state.collectionItems.push(...Array.from({ length: 10 }, (_, i) => rampCard(i)));
    const held = rampCard(0).oracleId as string;
    vi.mocked(loadAvailability).mockResolvedValueOnce(
      new Map([[held, { owned: 1, hard: 1, soft: 0, free: 0, claims: [] }]]) as unknown as Awaited<ReturnType<typeof loadAvailability>>,
    );

    await fillDeck("deck-3");

    const inserted = stub.state.insertCalls
      .filter((c) => c.table === "deck_cards")
      .flatMap((c) => c.values as { oracleId: string }[]);
    expect(inserted.length).toBeGreaterThan(0);
    expect(inserted.some((r) => r.oracleId === held)).toBe(false);
    expect(loadAvailability).toHaveBeenCalledWith("user_1", expect.objectContaining({ excludeDeckId: "deck-3" }));

    // A claim read that fails would widen the pool to copies another deck holds: refuse instead.
    stub.state.insertCalls.length = 0;
    vi.mocked(loadAvailability).mockRejectedValueOnce(new Error("claim read"));
    await expect(fillDeck("deck-3")).rejects.toThrow("claim read");
    expect(stub.state.insertCalls.some((c) => c.table === "deck_cards")).toBe(false);
  });

  it("refuses a budget that is not whole dollars, and a bracket outside 1 to 5", async () => {
    stub.state.cards.push(commanderCard());
    await expect(runAsked({ ...answers, budgetDollars: 1.5 })).rejects.toThrow("budget must be whole dollars");
    await expect(runAsked({ ...answers, bracket: 6 })).rejects.toThrow("bracket must be 1 to 5");
  });
});
