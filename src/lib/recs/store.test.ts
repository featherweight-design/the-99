import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

// store.ts imports the db client, which throws at module init without DATABASE_URL.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));
// The guard's in-transaction re-read is the index TOKEN (`readIndexGeneration`), read on the
// transaction it is handed. Answered here off that transaction's own index read, so each case
// still states its index as a date and the trace still records the read where it happens.
// `indexRead.fails` stands for a token read that fails; it throws only when the caller asks for
// a strict read, as the real reader does, and answers the soft "0" otherwise.
const indexRead = vi.hoisted(() => ({ fails: false, strictSeen: [] as boolean[] }));
vi.mock("../cache/index-generation", () => ({
  readIndexGeneration: async (
    q: { select: (x?: unknown) => { from: () => PromiseLike<{ at: Date | null }[]> } },
    opts: { strict?: boolean } = {},
  ) => {
    indexRead.strictSeen.push(opts.strict === true);
    if (indexRead.fails) {
      if (opts.strict) throw new Error("relation does not exist");
      return "0";
    }
    const [row] = await q.select({}).from();
    return row?.at ? String(row.at.getTime()) : "0";
  },
}));

// The label re-read inside the write's transaction (`labelCheck`), answered here.
const labelRead = vi.hoisted(() => ({ sets: new Map<string, string[]>() }));
vi.mock("../labels/read", () => ({ readLabelRoleSets: async () => labelRead.sets }));

import { roleSetFingerprint } from "../labels/role-sets";
import {
  findScoredCommander,
  INDEX_UNREADABLE,
  indexGeneration,
  isSchemaLagError,
  loadScores,
  persistScores,
  rowToListItem,
  toScoreRow,
} from "./store";
import { generationToken } from "./store";
import type { RankedCommander } from "./recommend";
import { RANK_SCORE_UNWRITTEN, SCORE_WRITER_CURRENT } from "../../db/schema";

/** The generation token a compute captured, for a collection last confirmed at `at`. */
const gen = (at: Date | null) => generationToken(null, at ? at.getTime() : null);

// The last writer that took no `SCORE_INDEX_LOCK` and compared no index
// generation — #681's, which is live and calls `persistScores` with three
// arguments. Every row it leaves behind has to be refused, so the current
// version must sit above it.
const LAST_UNGUARDED_WRITER = 3;

const ranked = (over: Partial<RankedCommander> = {}): RankedCommander => ({
  oracleId: "11111111-1111-1111-1111-111111111111",
  name: "Atraxa, Praetors' Voice",
  colorIdentity: ["W", "U", "B", "G"],
  imageUri: "https://x.test/a.jpg",
  artCropUri: null,
  typeLine: "Legendary Creature — Phyrexian Angel Horror",
  oracleText: "Flying, vigilance, deathtouch, lifelink",
  manaCost: "{G}{W}{U}{B}",
  colorPoolSize: 420,
  edhrecOwnedCount: 30,
  edhrecTotal: 100,
  roleCounts: { ramp: 10, draw: 8, removal: 9, wipes: 3 },
  roleGaps: [],
  roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
  overlapOwned: ["Sol Ring", "Cultivate"], overlapOwnedIds: ["a", "b"],
  fitPool: 15,
  fitRoles: 25,
  fitSynergy: 18,
  score: 58,
  measurableTotal: 100,
  rankScore: 58,
  slug: "atraxa-praetors-voice",
  synergyState: "ok",
  ...over,
});

describe("toScoreRow", () => {
  it("carries the list fields and drops detail-only ones", () => {
    const row = toScoreRow("user_1", ranked());
    expect(row.userId).toBe("user_1");
    expect(row.slug).toBe("atraxa-praetors-voice");
    expect(row.score).toBe(58);
    expect(row.synergyState).toBe("ok");
    // Detail-only fields must not be persisted.
    expect(row).not.toHaveProperty("roleCards");
    expect(row).not.toHaveProperty("overlapMissing");
    expect(row).not.toHaveProperty("oracleText");
  });

  // Admin PR 6d-2: the writer version carries the role basis, and the basis is the reader's resolved
  // `LABEL_ROLE_COUNTS_ENABLED`. The environment has it off and the env handed in has it on, so a row
  // stamped from `process.env` would claim the classifier for scores counted by label.
  it("stamps the writer version of the env it is handed, not the environment's", () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "false");
    try {
      const on = { LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
      expect(toScoreRow("user_1", ranked(), on).writerVersion).toBe(-SCORE_WRITER_CURRENT);
      expect(toScoreRow("user_1", ranked()).writerVersion).toBe(SCORE_WRITER_CURRENT);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("preformats receipts rather than storing the raw overlap list", () => {
    expect(typeof toScoreRow("user_1", ranked()).receipts).toBe("string");
  });

  it("stores null fitSynergy for a degraded row", () => {
    const row = toScoreRow("user_1", ranked({ fitSynergy: null, synergyState: "degraded" }));
    expect(row.fitSynergy).toBeNull();
    expect(row.synergyState).toBe("degraded");
  });

  it("persists the slug so the detail URL survives a re-rank", () => {
    // Slugs are assigned in rank order with -2/-3 dedup, so recomputing after a
    // rank change could hand the same commander a different slug. Persisting it
    // is what decouples the URL from the ranking.
    expect(toScoreRow("user_1", ranked({ slug: "atraxa-praetors-voice-2" })).slug)
      .toBe("atraxa-praetors-voice-2");
  });
});

describe("rowToListItem", () => {
  it("rehydrates a list item by joining card fields", () => {
    const item = rowToListItem({
      oracleId: "11111111-1111-1111-1111-111111111111",
      slug: "atraxa-praetors-voice",
      score: 58,
      rankScore: 58,
      fitPool: 15,
      fitRoles: 25,
      fitSynergy: 18,
      synergyState: "ok",
      edhrecOwnedCount: 30,
      edhrecTotal: 100,
      receipts: "own Sol Ring, Cultivate",
      colorPoolSize: 420,
      roleCounts: { ramp: 10, draw: 8, removal: 9, wipes: 3 },
      name: "Atraxa, Praetors' Voice",
      typeLine: "Legendary Creature — Phyrexian Angel Horror",
      colorIdentity: ["W", "U", "B", "G"],
      imageUri: "https://x.test/a.jpg",
      artCropUri: null,
    });
    expect(item.name).toBe("Atraxa, Praetors' Voice");
    expect(item.slug).toBe("atraxa-praetors-voice");
    expect(item.score).toBe(58);
    expect(item.imageUri).toBe("https://x.test/a.jpg");
  });

  it("maps a degraded row to a null fitSynergy list item", () => {
    const item = rowToListItem({
      oracleId: "22222222-2222-2222-2222-222222222222",
      // `rankScore` equals `score` for every row writer 5 emits, degraded included: the
      // rescale that made a no-synergy row read 40 against a score of 16 is retired.
      slug: "x", score: 16, rankScore: 16, fitPool: 10, fitRoles: 6, fitSynergy: null,
      synergyState: "degraded", edhrecOwnedCount: null, edhrecTotal: null,
      receipts: "", colorPoolSize: 100,
      roleCounts: { ramp: 1, draw: 1, removal: 1, wipes: 0 },
      name: "X", typeLine: "Legendary Creature", colorIdentity: ["R"], imageUri: null, artCropUri: null,
    });
    expect(item.fitSynergy).toBeNull();
    expect(item.edhrecTotal).toBeNull();
  });
});

/**
 * Fake transaction exposing only what persistScores touches. `confirmedAt` is what
 * the in-transaction generation re-read observes.
 */
function fakeDb(
  confirmedAt: Date | null,
  indexAt: Date | null = null,
  /** The ledger's `max(seq)` now, or `absent` for a database without `collection_history`. */
  ledger: number | null | "absent" = null,
) {
  const inserted: unknown[][] = [];
  let deleted = false;
  let conflictSet: Record<string, unknown> | null = null;
  const executed: string[] = [];
  // ONE ORDERED TRACE ACROSS BOTH KINDS OF CALL, because the property under
  // test is an ORDERING and `executed` cannot express one: a trace of
  // statements alone says a lock was taken somewhere in the transaction, and a
  // regression that moves it after the fingerprint read it protects passes
  // every assertion built on that. Reads are recorded where they are AWAITED
  // rather than where the thenable is built, or the index read would appear in
  // every case including the ones that never ask for it.
  const trace: string[] = [];
  const tx = {
    execute: async (q: unknown) => {
      const text = JSON.stringify(q);
      executed.push(text);
      // The collection fingerprint: whether the ledger exists, then one read over both writers.
      // The first is part of the same read and adds nothing to the ordering trace.
      if (text.includes("to_regclass")) return { rows: [{ present: ledger !== "absent" }] };
      if (text.includes("csv_uploads")) {
        trace.push("read:collection");
        // A query naming the ledger on a database without it fails, as Postgres would.
        if (ledger === "absent" && text.includes("collection_history")) {
          throw Object.assign(new Error("relation does not exist"), { code: "42P01" });
        }
        return { rows: [{ seq: ledger === "absent" ? null : ledger, at: confirmedAt ? confirmedAt.getTime() : null }] };
      }
      trace.push(
        text.includes("pg_advisory_xact_lock_shared")
          ? "lock:index-shared"
          : text.includes("pg_advisory_xact_lock")
            ? "lock:user"
            : "execute",
      );
    },
    // Two call shapes, two answers. The collection fingerprint ends at
    // `.where()`; the index fingerprint has no predicate and awaits `.from()`
    // directly, so `from` is both thenable and carries a `where`. Returning one
    // value for both would have the index guard read the collection's clock.
    select: () => ({
      from: () => ({
        then: (resolve: (rows: { at: Date | null }[]) => void) => {
          trace.push("read:index");
          resolve([{ at: indexAt }]);
        },
        where: async () => {
          throw new Error("the collection fingerprint is read through execute");
        },
      }),
    }),
    delete: () => ({ where: async () => { deleted = true; } }),
    insert: () => ({
      values: (rows: unknown[]) => ({
        onConflictDoUpdate: async (arg: { set: Record<string, unknown> }) => {
          inserted.push(rows);
          conflictSet = arg.set;
        },
      }),
    }),
  };
  return {
    db: { transaction: (cb: (t: typeof tx) => Promise<void>) => cb(tx) },
    wrote: () => ({ deleted, insertedRows: inserted.flat().length }),
    conflictSet: () => conflictSet,
    executed: () => executed,
    trace: () => trace,
  };
}

describe("persistScores generation guard", () => {
  it("writes when the collection generation is unchanged", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at));

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  it("drops the write when an upload replaced the collection mid-compute", async () => {
    const fake = fakeDb(new Date("2026-07-24T12:05:00Z"));
    stub.db.transaction = fake.db.transaction;

    // Captured before the newer confirm landed.
    await persistScores("user_1", [ranked()], gen(new Date("2026-07-24T12:00:00Z")));

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });

  it("writes for a user who has never confirmed an upload", async () => {
    const fake = fakeDb(null);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(null));

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  // THE REBUILD RACE. `buildCommanderIndex` deletes this table when it
  // finishes, which handles the ordinary case; what it cannot handle is a
  // compute that read support BEFORE the delete and upserts after it. Those
  // rows are writer-version-current, so nothing downstream can tell — which is
  // why the write has to be dropped here.
  it("drops the write when the commander index was rebuilt mid-compute", async () => {
    const collection = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(collection, new Date("2026-09-03T04:10:00Z"));
    stub.db.transaction = fake.db.transaction;

    // Captured before the rebuild committed.
    await persistScores(
      "user_1",
      [ranked()],
      gen(collection),
      String(new Date("2026-08-03T04:10:00Z").getTime()),
    );

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });

  it("writes when the commander index is unchanged", async () => {
    const collection = new Date("2026-07-24T12:00:00Z");
    const index = new Date("2026-09-03T04:10:00Z");
    const fake = fakeDb(collection, index);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(collection), String(index.getTime()));

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  // A caller that cannot know the generation must still be able to write. Every
  // caller behaved this way before the parameter existed, and defaulting to a
  // check would have turned them into callers that never write. OMITTED, which
  // is a different value from `null` — see the case below.
  it("skips the index check when the caller omits the argument", async () => {
    const collection = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(collection, new Date("2026-09-03T04:10:00Z"));
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(collection));

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  // An empty index reads as the token's unstamped "0", and that is a REAL reading
  // rather than a missing one: it must compare equal to itself and let the write
  // through, which is why omitting the argument is a different value.
  it("writes when both sides read an empty index", async () => {
    const collection = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(collection, null);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(collection), "0");

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  // A FAILED read is not an empty index. Read softly, two failures would both answer "0",
  // compare equal, and let the write through with no guard at all.
  it("abandons the write when the in-transaction re-read fails", async () => {
    const collection = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(collection, null);
    stub.db.transaction = fake.db.transaction;
    indexRead.fails = true;
    try {
      await expect(persistScores("user_1", [ranked()], gen(collection), "0"))
        .rejects.toThrow("relation does not exist");
    } finally {
      indexRead.fails = false;
    }
    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });

  it("reads the token before the compute strictly, and answers one no reading can equal", async () => {
    indexRead.fails = true;
    indexRead.strictSeen.length = 0;
    try {
      expect(await indexGeneration()).toBe(INDEX_UNREADABLE);
    } finally {
      indexRead.fails = false;
    }
    expect(indexRead.strictSeen).toEqual([true]);
  });

  it("writes nothing over a token taken from a failed read", async () => {
    const collection = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(collection, null);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(collection), INDEX_UNREADABLE);

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
    expect(fake.trace()).toEqual([]);
  });

  // And the asymmetry that proves "0" is compared rather than ignored: the
  // caller read an empty index, the index has since been built.
  it("drops the write when the index was built after an empty reading", async () => {
    const collection = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(collection, new Date("2026-09-03T04:10:00Z"));
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(collection), "0");

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });

  // THE LOCK IS WHAT MAKES THE COMPARISON MEAN ANYTHING, and it is invisible in
  // every result this function produces — a write with the lock and a write
  // without one look identical. So it is asserted from the statements the
  // transaction executed.
  //
  // A first version of the guard had only the comparison, which proves the
  // index had not moved at the instant it ran and not at COMMIT: a rebuild
  // could commit its support writes and its clear in the gap before the
  // inserts, and those pre-rebuild rows would survive.
  it("takes both locks before either fingerprint read", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at, at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at), String(at.getTime()));

    // Asserted as the whole sequence rather than as two `indexOf` comparisons,
    // because what makes this write safe is that NOTHING is read before the
    // locks are held — and a pair of "before" checks passes over a third read
    // that slipped between them.
    expect(fake.trace()).toEqual([
      "execute", // the writer-version stamp
      "lock:user",
      "lock:index-shared",
      "read:collection",
      "read:index",
    ]);
  });

  // A LOCK AFTER THE COMPARISON IS NOT A LOCK. This transaction can park on
  // either key, and while it is parked the thing it just compared moves: with
  // the index lock taken after the collection read, a rebuild holding that key
  // held this write long enough for an upload to commit, delete this user's
  // scores, and be followed by these pre-upload rows landing anyway. Round 2.
  it("takes the user lock before reading the collection generation", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at, at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at), String(at.getTime()));

    const t = fake.trace();
    // Membership first, and not as belt-and-braces: `indexOf` returns -1 for an
    // absent entry and -1 is less than every index, so the comparison below
    // PASSES when the lock is not taken at all. Found by removing it.
    expect(t).toContain("lock:user");
    expect(t.indexOf("lock:user")).toBeLessThan(t.indexOf("read:collection"));
    // The per-user key is `replaceCollection`'s own, which is what makes the
    // collection comparison atomic with the writes below it.
    expect(fake.executed().join(" ")).toContain("hashtextextended");
  });

  it("takes the index lock shared, never exclusive", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at, at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at), String(at.getTime()));

    // Shared on the index key: score writes have no reason to serialise
    // against each other, and the one exclusive taker is the rebuild. Read
    // off the trace, since the per-user lock IS exclusive and a substring
    // sweep of the raw statements cannot tell the two keys apart.
    expect(fake.trace()).toContain("lock:index-shared");
  });

  // No index generation means no check, so there is nothing for a lock to
  // protect and taking one would serialise every caller that predates this
  // parameter against a rebuild for no reason.
  it("takes no lock when the caller omits the index generation", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at, at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at));

    // The per-user lock is unconditional — the collection guard always runs —
    // so what an omitted index generation must skip is the INDEX key and its
    // read, not every lock in the transaction.
    expect(fake.trace()).toEqual(["execute", "lock:user", "read:collection"]);
  });

  // A label publish can commit between the compute's label read and this write. The sets the
  // compute counted by are fingerprinted, and re-read under the lock before any row is stored
  // (labels-everywhere PR 5).
  describe("with a label check", () => {
    const ids = ["a", "b"];
    const counted = new Map<string, ("ramp" | "draw")[]>([["a", ["ramp"]], ["b", ["draw"]]]);
    const check = { oracleIds: ids, fingerprint: roleSetFingerprint(ids, counted) };

    it("writes when the labels have not moved", async () => {
      const at = new Date("2026-07-24T12:00:00Z");
      const fake = fakeDb(at, at);
      stub.db.transaction = fake.db.transaction;
      labelRead.sets = new Map(counted);
      await persistScores("user_1", [ranked()], gen(at), String(at.getTime()), check);
      expect(fake.conflictSet()).not.toBeNull();
    });

    it("drops the write when a label publish moved a card's roles", async () => {
      const at = new Date("2026-07-24T12:00:00Z");
      const fake = fakeDb(at, at);
      stub.db.transaction = fake.db.transaction;
      labelRead.sets = new Map([["a", ["draw"]], ["b", ["draw"]]]);
      await persistScores("user_1", [ranked()], gen(at), String(at.getTime()), check);
      expect(fake.conflictSet()).toBeNull();
    });

    it("drops the write when a card lost its label", async () => {
      const at = new Date("2026-07-24T12:00:00Z");
      const fake = fakeDb(at, at);
      stub.db.transaction = fake.db.transaction;
      labelRead.sets = new Map([["b", ["draw"]]]);
      await persistScores("user_1", [ranked()], gen(at), String(at.getTime()), check);
      expect(fake.conflictSet()).toBeNull();
    });
  });

  // Most of a set's rows already exist, so the conflict path is the one that
  // runs. A version left out of it survives the recompute meant to heal it, and
  // `loadScores` condemns the set again on the very next read — a recompute on
  // every request, for good.
  it("carries the writer version through the conflict path, not only the insert", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at));

    expect(Object.keys(fake.conflictSet() ?? {})).toContain("writerVersion");
  });

  // The trigger in 0027 stamps every row a transaction touches as stale unless it
  // sees this setting, which is what stops an older deployment's upsert leaving a
  // truncated set marked current. `scripts/probe-writer-version.mjs` proves the
  // trigger itself; this proves the announcement is made.
  it("announces its writer version inside the transaction", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at));

    const announced = fake.executed().join(" ");
    expect(announced).toContain("set_config");
    expect(announced).toContain("app.writer_version");
    expect(announced).toContain(String(SCORE_WRITER_CURRENT));
  });

  // THE LOCK AND THE VERSION ARE ONE FIX, and this is the half no other case
  // states. `persistScores` still has an unchecked three-argument path, and it
  // cannot be closed by making the argument required: what reaches it is a
  // PREVIOUS DEPLOYMENT, running code with no fourth argument to pass, which can
  // insert after a rebuild's clear and announce the version it knows. Unless the
  // version moves with the guard, those rows read as current for ever.
  //
  // Pinned as an inequality against the guard's arrival rather than as the
  // literal 4, so the next bump does not have to edit this case to keep it true.
  it("announces a writer version above the last unguarded one", () => {
    expect(SCORE_WRITER_CURRENT).toBeGreaterThan(LAST_UNGUARDED_WRITER);
  });

  // THE LEDGER HALF. A hand edit moves the ledger's seq and never the upload timestamp, so a
  // compute captured before one has to be dropped on the seq alone.
  it("drops the write when a ledger write landed mid-compute, timestamp unchanged", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at, null, 8);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], generationToken(7, at.getTime()));

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });

  it("writes when the ledger's seq and the timestamp both match", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at, null, 8);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], generationToken(8, at.getTime()));

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  // A preview deploy runs no migrations. The read must not name the missing table, or the
  // statement aborts persistScores' transaction and no score is ever stored there.
  it("writes on a database without the ledger, never naming the missing table", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at, null, "absent");
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(at));

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  it("drops the write when the first-ever confirm lands mid-compute", async () => {
    const fake = fakeDb(new Date("2026-07-24T12:05:00Z"));
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], gen(null));

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });
});

const pgError = (code: string) => Object.assign(new Error(`pg error ${code}`), { code });

type SelectChain = {
  from: () => SelectChain;
  innerJoin: () => SelectChain;
  where: () => SelectChain;
  orderBy: () => Promise<never>;
};

function rejectingSelect(err: unknown): () => SelectChain {
  const chain: SelectChain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    orderBy: () => Promise.reject(err),
  };
  return () => chain;
}

describe("isSchemaLagError", () => {
  it("matches undefined_table, the code from the #70 outage", () => {
    expect(isSchemaLagError(pgError("42P01"))).toBe(true);
  });

  it("matches undefined_column, the same class one deploy later", () => {
    expect(isSchemaLagError(pgError("42703"))).toBe(true);
  });

  it("rejects other postgres errors so real faults still surface", () => {
    expect(isSchemaLagError(pgError("57014"))).toBe(false);
  });

  it("rejects errors carrying no code", () => {
    expect(isSchemaLagError(new Error("connection terminated"))).toBe(false);
  });

  it("rejects non-errors", () => {
    expect(isSchemaLagError(null)).toBe(false);
    expect(isSchemaLagError("42P01")).toBe(false);
  });
});

describe("loadScores and the rows a mid-deploy write left behind", () => {
  // Two shapes this cannot serve, one sentinel each: a row written after 0017
  // added `rank_score` but before the deployment that fills it went live, and a
  // row written by a writer older than `SCORE_WRITER_CURRENT` — which, for
  // version 1, means a set with its built commanders deleted out of it.
  const row = (over: Record<string, unknown> = {}) => ({
    oracleId: "11111111-1111-1111-1111-111111111111",
    slug: "atraxa-praetors-voice",
    score: 58,
    rankScore: 58,
    fitPool: 15,
    fitRoles: 25,
    fitSynergy: 18,
    synergyState: "ok",
    edhrecOwnedCount: 30,
    edhrecTotal: 100,
    receipts: "Sol Ring, Cultivate",
    colorPoolSize: 420,
    roleCounts: { ramp: 10, draw: 8, removal: 9, wipes: 3 },
    name: "Atraxa, Praetors' Voice",
    colorIdentity: ["W", "U", "B", "G"],
    imageUri: "https://x.test/a.jpg",
    writerVersion: SCORE_WRITER_CURRENT,
    ...over,
  });

  function resolvingSelect(rows: unknown[]) {
    const chain = { from: () => chain, innerJoin: () => chain, where: () => chain, orderBy: () => Promise.resolve(rows) };
    return () => chain;
  }

  beforeEach(() => {
    delete stub.db.select;
  });

  it("serves rows this code wrote", async () => {
    stub.db.select = resolvingSelect([row()]);
    const { items } = await loadScores("user_1");
    expect(items).toHaveLength(1);
  });

  // Neither empty nor degraded, so nothing else would ever mark the list stale.
  it("reads a sentinel rank score as a miss so the caller recomputes", async () => {
    stub.db.select = resolvingSelect([row({ rankScore: RANK_SCORE_UNWRITTEN })]);
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  // persistScores writes a user's rows in one transaction, so a set holding one such row
  // was written whole by that deployment. Keeping the rest would serve a truncated list.
  it("condemns the whole set rather than dropping the one row", async () => {
    stub.db.select = resolvingSelect([row(), row({ rankScore: RANK_SCORE_UNWRITTEN })]);
    const { items } = await loadScores("user_1");
    expect(items).toEqual([]);
  });

  // Version 1 is a set written before built commanders were scored, so rows are
  // missing from it — and it is neither empty nor degraded, so nothing else would
  // ever mark it stale.
  it("reads an older writer's rows as a miss", async () => {
    stub.db.select = resolvingSelect([row({ writerVersion: 1 })]);
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  it("condemns a set where only one row predates the current writer", async () => {
    stub.db.select = resolvingSelect([row(), row({ writerVersion: 1 })]);
    const { items } = await loadScores("user_1");
    expect(items).toEqual([]);
  });

  it("names the current writer on every row it writes", () => {
    expect(toScoreRow("user_1", ranked()).writerVersion).toBe(SCORE_WRITER_CURRENT);
  });

  // The role basis rides in the version (labels-everywhere PR 5): the switch flipping either way
  // must make the other basis's persisted set a miss, never serve it as current.
  describe("by role basis", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("stamps a label-counted row with the negated writer version", () => {
      vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
      expect(toScoreRow("user_1", ranked()).writerVersion).toBe(-SCORE_WRITER_CURRENT);
    });

    it("reads a classifier-counted set as a miss with the switch on", async () => {
      vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
      stub.db.select = resolvingSelect([row({ writerVersion: SCORE_WRITER_CURRENT })]);
      await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
    });

    it("serves a label-counted set with the switch on", async () => {
      vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
      stub.db.select = resolvingSelect([row({ writerVersion: -SCORE_WRITER_CURRENT })]);
      expect((await loadScores("user_1")).items).toHaveLength(1);
    });

    it("reads a label-counted set as a miss with the switch off, so a rollback restores the classifier", async () => {
      vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "");
      stub.db.select = resolvingSelect([row({ writerVersion: -SCORE_WRITER_CURRENT })]);
      await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
    });
  });
});

describe("loadScores when the schema is behind the code", () => {
  beforeEach(() => {
    delete stub.db.select;
  });

  it("reads as an empty cache so the caller recomputes", async () => {
    stub.db.select = rejectingSelect(pgError("42P01"));
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  it("treats a missing column the same way", async () => {
    stub.db.select = rejectingSelect(pgError("42703"));
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  it("rethrows anything else rather than hiding it behind a recompute", async () => {
    stub.db.select = rejectingSelect(pgError("53300"));
    await expect(loadScores("user_1")).rejects.toThrow("pg error 53300");
  });
});

describe("findScoredCommander when the schema is behind the code", () => {
  // The ranked CTE columns are consumed by eq() and by the select builder, so they
  // are stubbed with real SQL fragments rather than bare objects.
  const col = sql`x`;
  const rankedStub = { oracleId: col, rank: col, anyDegraded: col, slug: col };

  function stubWith(err: unknown) {
    const limit = vi.fn(() => Promise.reject(err));
    stub.db.$with = () => ({ as: () => rankedStub });
    stub.db.select = () => ({ from: () => ({ where: () => ({}) }) });
    stub.db.with = () => ({
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    });
    return limit;
  }

  it("resolves to null so the page falls back to the computed ranking", async () => {
    const limit = stubWith(pgError("42P01"));
    await expect(findScoredCommander("user_1", "atraxa-praetors-voice")).resolves.toBeNull();
    // Proves the query chain actually executed rather than throwing early, which
    // would make the null above a false pass.
    expect(limit).toHaveBeenCalled();
  });

  it("rethrows anything else", async () => {
    stubWith(pgError("53300"));
    await expect(findScoredCommander("user_1", "atraxa-praetors-voice")).rejects.toThrow(
      "pg error 53300",
    );
  });
});
