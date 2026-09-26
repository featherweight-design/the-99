import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCollectionCsv } from "../manabox/parse";
import { collectionItemKey } from "./key";
import type { CatalogCard, PrintingIdentity } from "./match";
import { planCollectionSeed, readCsv, type SeedCollectionSource } from "./seed-collection";

/**
 * `pnpm db:seed:collection` against the real 2,934-row ManaBox export checked in at
 * data/the-vault.csv.
 *
 * The script's headline numbers (2,821 imported / 113 skipped / 0 unmatched) come from a seeded
 * `cards` + `printings` + `skipped_printings`, which a unit test has no access to — so the
 * catalog here is DERIVED FROM THE FIXTURE rather than from the database. What that still
 * proves is everything the seed script itself owns: the parse → match → aggregate pipeline runs
 * clean at full scale, printing identity survives it, and the aggregation key stays unique
 * across 2,934 real rows. The real-catalog counts are verified by running the script.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const vaultCsv = readCsv(join(repoRoot, "data", "the-vault.csv"));

/** A cards/printings pair that resolves every row in the fixture, one oracle id per card name. */
function sourceFromFixture(csv: string, skipNames: string[] = []): SeedCollectionSource {
  const { rows } = parseCollectionCsv(csv);
  const oracleByName = new Map<string, string>();
  const catalog: CatalogCard[] = [];
  const printings: PrintingIdentity[] = [];
  const skippedScryfallIds: string[] = [];
  const skip = new Set(skipNames);
  for (const row of rows) {
    if (skip.has(row.name)) {
      if (row.scryfallId) skippedScryfallIds.push(row.scryfallId);
      continue;
    }
    let oracleId = oracleByName.get(row.name);
    if (!oracleId) {
      oracleId = `00000000-0000-4000-8000-${String(oracleByName.size).padStart(12, "0")}`;
      oracleByName.set(row.name, oracleId);
      // The oracle catalog carries ONE arbitrary printing per card — deliberately not the
      // fixture's, so name matching cannot be what makes these rows resolve.
      catalog.push({ oracleId, scryfallId: `arbitrary-${oracleId}`, name: row.name, layout: "normal", typeLine: "Creature" });
    }
    if (row.scryfallId) printings.push({ scryfallId: row.scryfallId, oracleId });
  }
  return { catalog, indexes: { printings, skippedScryfallIds } };
}

describe("planCollectionSeed against data/the-vault.csv", () => {
  const source = sourceFromFixture(vaultCsv);
  const result = planCollectionSeed(vaultCsv, source);

  it("parses every row of the real export without error", () => {
    expect(result.rowsRead).toBe(2934);
    expect(result.parseErrors).toBe(0);
  });

  it("matches every row on printing id alone", () => {
    expect(result.unmatched).toBe(0);
  });

  it("imports the full card count, quantities included", () => {
    expect(result.imported).toBe(3869);
  });

  it("aggregates the two duplicate rows into one holding", () => {
    // 2,934 rows carry 2,933 distinct primary keys; exactly one pair merges.
    expect(result.holdings).toBe(2933);
  });

  it("produces a unique aggregation key per holding — the 23505 guard, at full scale", () => {
    const keys = result.items.map((i) => collectionItemKey({
      oracleId: i.oracleId, setCode: i.setCode,
      collectorNumber: i.collectorNumber!, finish: i.finish!,
    }));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("writes printing identity on every holding", () => {
    expect(result.items.every((i) => i.collectorNumber !== "")).toBe(true);
    expect(result.items.every((i) => i.finish === "nonfoil" || i.finish === "foil")).toBe(true);
    expect(result.items.every((i) => i.setCode === i.setCode.toLowerCase())).toBe(true);
  });

  it("reports token rows as skipped-by-design rather than unmatched (§9.1)", () => {
    const skipped = sourceFromFixture(vaultCsv, ["Sol Ring"]);
    const withTokens = planCollectionSeed(vaultCsv, skipped);
    expect(withTokens.skipped).toBeGreaterThan(0);
    expect(withTokens.unmatched).toBe(0);
    expect(withTokens.imported).toBeLessThan(result.imported);
  });
});
