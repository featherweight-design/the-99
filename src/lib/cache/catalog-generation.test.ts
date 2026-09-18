// The stamp's translation into a key segment, and the promise that an unreadable stamp
// costs freshness rather than the page.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
// No incremental cache outside a request, which is what `unstable_cache` raises on — the
// state every non-request caller is in, and the one the fallback exists for.
vi.mock("next/cache", () => ({
  unstable_cache: () => () => { throw new Error("Invariant: incrementalCache missing"); },
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
    await expect(catalogGeneration()).resolves.toBe("0");
  });
});
