// The stamp's translation into a key segment, and the promise that an unreadable stamp
// costs freshness rather than the page.
import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as { millis: string | null }[], where: null as unknown }));

// A chainable stub shaped like the one query this module makes, so the reader's own
// composition runs: the mocked cache below invokes the callback, and what it invokes is
// `readCatalogGeneration` — not a copy of its SQL.
vi.mock("../../db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (clause: unknown) => {
          rows.where = clause;
          return Promise.resolve(rows.value);
        },
      }),
    }),
  },
}));
// No incremental cache outside a request, which is what `unstable_cache` raises on — the
// state every non-request caller is in, and the one the fallback exists for.
const cache = vi.hoisted(() => ({ throws: true }));

vi.mock("next/cache", () => ({
  unstable_cache: (load: () => Promise<string>) => () => {
    if (cache.throws) throw new Error("Invariant: incrementalCache missing");
    return load();
  },
}));

const { catalogGeneration, generationKey } = await import("./catalog-generation");

describe("generationKey", () => {
  // A bigint arrives from the driver as a string, and the query already computed the epoch
  // — so this normalises rather than parses. The parse is what could not be made safe: the
  // column carries no zone, and a `Date` built from its rendering takes the reading host's
  // clock with it, so two servers in different zones would key one stamp two ways.
  it("takes the epoch the query computed", () => {
    expect(generationKey("1789732800000")).toBe("1789732800000");
    expect(generationKey(1789732800000)).toBe("1789732800000");
  });

  // Before any ingest has run, and after one that could not be read. Both mean "no catalog
  // generation is known", which is one key rather than two.
  it("falls back to a constant for an absent or unreadable stamp", () => {
    expect(generationKey(null)).toBe("0");
    expect(generationKey(undefined)).toBe("0");
    expect(generationKey("")).toBe("0");
    expect(generationKey("not a number")).toBe("0");
  });
});

describe("catalogGeneration", () => {
  // The direction to fail in: the generation buys freshness, and a page is worth more.
  it("answers the constant rather than throwing when the cache is unavailable", async () => {
    cache.throws = true;
    await expect(catalogGeneration()).resolves.toBe("0");
  });

  // THE PATH THAT ACTUALLY RUNS IN PRODUCTION, which the fallback case above says nothing
  // about: a reader that returned "0" for every request would pass that one while pinning
  // every cache key to the same value forever.
  it("answers the stamp the query returned", async () => {
    cache.throws = false;
    rows.value = [{ millis: "1789732800000" }];
    await expect(catalogGeneration()).resolves.toBe("1789732800000");
  });

  // An empty table is a catalog nobody has stamped, which is the same key as one that
  // cannot be read — not a crash, and not a fresh generation per request.
  it("answers the constant when no stamp has been written", async () => {
    cache.throws = false;
    rows.value = [];
    await expect(catalogGeneration()).resolves.toBe("0");
  });

  // The canonical row, by id. Composed here rather than assumed: `limit(1)` with no `where`
  // would pass both cases above while taking whichever row Postgres reached first.
  it("asks for the canonical row rather than the first one", async () => {
    cache.throws = false;
    rows.value = [{ millis: "1789732800000" }];
    await catalogGeneration();
    expect(rows.where).not.toBeNull();
  });
});
