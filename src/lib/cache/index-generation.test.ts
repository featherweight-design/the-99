// The index stamp's read, and the promise that an unreadable one costs freshness rather
// than the page. Its twin in `catalog-generation.test.ts` pins `generationKey` itself;
// this pins the parts that differ — an aggregate over every row rather than a lookup by
// id, and a fallback that has to survive both a failing query and a missing cache.
import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({
  value: [] as { millis: string | null }[],
  throws: false,
}));

// Shaped like this module's one query: `select().from()` with no `where`, awaited
// directly. The reader's own composition runs, so what the cache invokes is
// `readIndexGeneration` rather than a copy of its SQL.
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
  it("answers the epoch the query computed", async () => {
    rows.throws = false;
    rows.value = [{ millis: "1758326400000" }];
    expect(await readIndexGeneration()).toBe("1758326400000");
  });

  it("answers the constant when no index run has ever completed", async () => {
    // `max()` over an empty table returns a row whose value is null, not no row — so this
    // is the state of every database before the first index build, and it must not key
    // the cache on the string "null".
    rows.throws = false;
    rows.value = [{ millis: null }];
    expect(await readIndexGeneration()).toBe("0");
  });

  it("answers the constant rather than throwing when the table is unreachable", async () => {
    // Freshness is the only thing this buys, so a failure falls back to the behaviour the
    // cache had before it existed. A throw here would 500 the review page over an
    // optimisation.
    rows.throws = true;
    expect(await readIndexGeneration()).toBe("0");
  });
});

describe("indexGeneration", () => {
  it("answers the constant rather than throwing outside a request", async () => {
    rows.throws = false;
    rows.value = [{ millis: "1758326400000" }];
    cache.throws = true;
    expect(await indexGeneration()).toBe("0");
    cache.throws = false;
  });
});
