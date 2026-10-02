// The index stamp's read, and the promise that an unreadable one costs freshness rather
// than the page. Its twin in `catalog-generation.test.ts` pins `generationKey` itself;
// this pins the parts that differ — an aggregate over every row rather than a lookup by
// id, and a fallback that has to survive both a failing query and a missing cache.
import { describe, expect, it, vi } from "vitest";

type Row = {
  support: string | null;
  pair: string | null;
  identity: string | null;
  staples: string | null;
  staplesWeight: string | null;
  supportRoles: string | null;
  pairRoles: string | null;
  supportRoleSum: string | null;
  pairRoleSum: string | null;
};

const rows = vi.hoisted(() => ({
  value: [] as Row[],
  throws: false,
}));

// Shaped like this module's one query: `select().from()` awaited directly. The reader's own
// composition runs, so what the cache invokes is `readIndexGeneration` rather than a copy of
// its SQL.
vi.mock("../../db", () => ({
  db: {
    select: () => ({
      from: () => {
        if (rows.throws) return Promise.reject(new Error("relation does not exist"));
        return Promise.resolve(rows.value);
      },
    }),
  },
}));

const cache = vi.hoisted(() => ({ throws: false }));

vi.mock("next/cache", () => ({
  unstable_cache: (load: () => Promise<string>) => () => {
    if (cache.throws) throw new Error("Invariant: incrementalCache missing");
    return load();
  },
}));

const { indexGeneration, readIndexGeneration } = await import("./index-generation");

describe("readIndexGeneration", () => {
  const row = (over: Partial<Row> = {}): Row => ({
    support: "1758326400000",
    pair: "1758326400000",
    identity: "1758326400000",
    staples: "777",
    staplesWeight: "51234",
    supportRoles: "3279",
    pairRoles: "12",
    supportRoleSum: "72140.512",
    pairRoleSum: "261.4",
    ...over,
  });

  it("joins every input the skeleton is built from", async () => {
    rows.throws = false;
    rows.value = [row()];
    expect(await readIndexGeneration())
      .toBe("1758326400000.1758326400000.1758326400000.777.51234.3279.12.72140.512.261.4");
  });

  // THE CASE THE MODULE EXISTS FOR. `deriveAndWriteRoleTargets` sets the four `avg_*`
  // columns and does NOT touch `computed_at` — that column is the index run's ownership
  // record and a later pass must not move it. So the first run that writes role averages
  // leaves both timestamps exactly where they were, and a token built from them alone would
  // sit still through the one event that flips every deck in the app from an asserted
  // baseline to a measured one.
  it("moves when roles are written even though no timestamp does", async () => {
    rows.throws = false;
    rows.value = [row({ supportRoles: "0", pairRoles: "0" })];
    const before = await readIndexGeneration();

    rows.value = [row({ supportRoles: "3279", pairRoles: "12" })];
    const after = await readIndexGeneration();

    expect(before).not.toBe(after);
  });

  // THE PROXY THAT WOULD HAVE BEEN WRONG. `db:build:staples` replaces `format_staples`
  // unconditionally but guards the composition write with `if (compRows.length > 0)` —
  // legitimate, because no commander carries a composition until the first widened index
  // run. So the staples can be rebuilt with every timestamp in this token standing still,
  // which is exactly the state a composition-timestamp proxy would have missed.
  // THE CASE THE ROLE SUM IS FOR (brief 2026-09-28 §5.4). A re-derivation writes new role
  // figures onto the SAME rows, so neither the counts above nor any timestamp moves, and the
  // fit score reads those figures. A stored score computed against the previous ones would
  // pass a guard built from this token without the sum.
  it("moves when a re-derivation changes role figures on the same rows", async () => {
    rows.throws = false;
    rows.value = [row({ supportRoles: "3279", supportRoleSum: "72140.512" })];
    const before = await readIndexGeneration();

    rows.value = [row({ supportRoles: "3279", supportRoleSum: "71988.25" })];
    expect(await readIndexGeneration()).not.toBe(before);
  });

  it("moves when only a pair's role figures change", async () => {
    rows.throws = false;
    rows.value = [row({ pairRoleSum: "261.4" })];
    const before = await readIndexGeneration();

    rows.value = [row({ pairRoleSum: "259.9" })];
    expect(await readIndexGeneration()).not.toBe(before);
  });

  it("moves when the staples are rebuilt and no timestamp changes", async () => {
    rows.throws = false;
    rows.value = [row({ staples: "777", staplesWeight: "51234" })];
    const before = await readIndexGeneration();

    rows.value = [row({ staples: "812", staplesWeight: "55901" })];
    expect(await readIndexGeneration()).not.toBe(before);
  });

  it("moves when the staples keep their count but not their figures", async () => {
    rows.throws = false;
    rows.value = [row({ staples: "777", staplesWeight: "51234" })];
    const before = await readIndexGeneration();

    rows.value = [row({ staples: "777", staplesWeight: "52010" })];
    expect(await readIndexGeneration()).not.toBe(before);
  });

  it("moves when only the pair support is restamped", async () => {
    // Its own read in the loader (`loadPairRow`), so its own input here. A pair rebuild that
    // changed figures while leaving the count alone would otherwise be invisible.
    rows.throws = false;
    rows.value = [row()];
    const before = await readIndexGeneration();

    rows.value = [row({ pair: "1758412800000" })];
    expect(await readIndexGeneration()).not.toBe(before);
  });

  it("moves when only the identity composition is rebuilt", async () => {
    // `db:build:staples` can be dispatched on its own, replacing `identity_composition`
    // without an index run behind it.
    rows.throws = false;
    rows.value = [row()];
    const before = await readIndexGeneration();

    rows.value = [row({ identity: "1758412800000" })];
    expect(await readIndexGeneration()).not.toBe(before);
  });

  it("answers the constant when nothing has ever been built", async () => {
    // Every input absent is one state, so it gets one spelling rather than "0.0.0.0".
    // `max()` over an empty table returns a row whose value is null, not no row — which is
    // every database before the first index build, and it must not key on the string "null".
    rows.throws = false;
    rows.value = [{
      support: null, pair: null, identity: null,
      staples: null, staplesWeight: null,
      supportRoles: null, pairRoles: null,
      supportRoleSum: null, pairRoleSum: null,
    }];
    expect(await readIndexGeneration()).toBe("0");
  });

  it("answers the constant rather than throwing when a table is unreachable", async () => {
    // Freshness is the only thing this buys, so a failure falls back to the behaviour the
    // cache had before it existed. A throw here would 500 the deck page over an
    // optimisation.
    rows.throws = true;
    expect(await readIndexGeneration()).toBe("0");
  });
});

describe("indexGeneration", () => {
  it("answers the constant rather than throwing outside a request", async () => {
    rows.throws = false;
    rows.value = [{
      support: "1758326400000", pair: "1758326400000", identity: "1758326400000",
      staples: "777", staplesWeight: "51234", supportRoles: "3279", pairRoles: "12",
      supportRoleSum: "72140.512", pairRoleSum: "261.4",
    }];
    cache.throws = true;
    expect(await indexGeneration()).toBe("0");
    cache.throws = false;
  });
});
