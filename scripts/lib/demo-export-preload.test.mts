// demo:export is a tsx script, so the reads it shares with the app reach `unstable_cache` with no incremental cache
// (step 7's Proposed cuts read: readProposedCuts → profileOfHead → cacheForUser). Like the cuts probes, it preloads
// `no-next-cache.cjs`, which makes the cache wrapper pass-through so the export reads the database.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scripts = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).scripts as Record<string, string>;

describe("demo:export", () => {
  it("preloads the pass-through next/cache shim", () => {
    expect(scripts["demo:export"]).toBe("NODE_OPTIONS=--require=./scripts/lib/no-next-cache.cjs tsx scripts/demo-export.mts");
  });
});
