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
  // Epoch millis, never the timestamp's own rendering: the column is `timestamp` without
  // time zone, and this repository has shipped the local-time parse bug once already.
  it("renders a stamp as epoch millis", () => {
    expect(generationKey(new Date("2026-09-18T12:00:00Z"))).toBe("1789732800000");
  });

  // THE FORM THAT CARRIES THE RISK, which an ISO string ending in `Z` does not: Postgres
  // renders this column without a zone, and `new Date("2026-09-18 12:00:00")` reads that as
  // LOCAL — 18:00Z on a UTC-6 host. Two servers in different zones would then derive two
  // keys from one stamp and split the cache between them. Run this file under `TZ` to see
  // it bite: the assertion is absolute, so a local parse fails it anywhere but UTC.
  it("reads a zoneless database timestamp as UTC", () => {
    expect(generationKey("2026-09-18 12:00:00")).toBe("1789732800000");
    expect(generationKey("2026-09-18T12:00:00")).toBe("1789732800000");
  });

  it("leaves a stamp that already names its zone alone", () => {
    expect(generationKey("2026-09-18T12:00:00Z")).toBe("1789732800000");
    expect(generationKey("2026-09-18T07:00:00-05:00")).toBe("1789732800000");
  });

  // Before any ingest has run, and after one that could not be read. Both mean "no catalog
  // generation is known", which is one key rather than two.
  it("falls back to a constant for an absent or unparseable stamp", () => {
    expect(generationKey(null)).toBe("0");
    expect(generationKey(undefined)).toBe("0");
    expect(generationKey("not a date")).toBe("0");
  });
});

describe("catalogGeneration", () => {
  // The direction to fail in: the generation buys freshness, and a page is worth more.
  it("answers the constant rather than throwing when the cache is unavailable", async () => {
    await expect(catalogGeneration()).resolves.toBe("0");
  });
});
