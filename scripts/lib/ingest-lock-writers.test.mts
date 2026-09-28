import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every script that writes a table a catalog copy publishes must hold the `catalog-ingest` lock
// the copy takes, or an ingest and a copy against one database can interleave and the copy can
// commit, or verify, a mixed generation. A writer added here without the lock fails this test.
const WRITERS = ["seed-sets.ts", "seed-cards.ts", "seed-printings.ts", "seed-prices.ts", "seed-combos.ts"];

describe("catalog writers hold the ingest lock", () => {
  it.each(WRITERS)("%s runs its ingest inside withCatalogIngestLock", (file) => {
    const src = readFileSync(join(import.meta.dirname, "..", file), "utf8");
    expect(src).toMatch(/withCatalogIngestLock\(\s*process\.env\.DATABASE_URL!,/);
  });
});
