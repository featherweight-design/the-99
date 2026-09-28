import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { cards } from "../../db/schema";
import { FINGERPRINT_COLUMNS, catalogFingerprintSql } from "./fingerprint";

// The modules whose output a copy replicates. A card column any of them reads is an INPUT to the
// copied facts, so the fingerprint has to cover it or two catalogs that differ in it would pass.
const BUILDERS = [
  "src/lib/edhrec/seed-index.ts",
  "src/lib/edhrec/pair-enumerate.ts",
  "src/lib/spellbook/seed.ts",
  "scripts/build-staples.ts",
  "scripts/build-commander-index.ts",
];

const snake = (camel: string) => camel.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

describe("the catalog input fingerprint", () => {
  it("covers every cards column a replicated builder reads", () => {
    // Two ways a builder reads `cards`: a Drizzle column (`cards.oracleText`) and raw SQL through
    // an alias (`cc.type_line` in build-staples, which reads the table no other way). The raw scan
    // takes any `alias.column` whose column is a `cards` column; a name shared with another table
    // is only ever a false positive, never a miss.
    const cardColumns = new Set(Object.values(getTableColumns(cards)).map((c) => c.name));
    const drizzle = new Set<string>();
    const raw = new Set<string>();
    for (const file of BUILDERS) {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      for (const [, col] of text.matchAll(/\bcards\.([a-zA-Z]+)\b/g)) drizzle.add(snake(col));
      for (const [, col] of text.matchAll(/\b[a-z_]+\.([a-z_]+)\b/g)) if (cardColumns.has(col)) raw.add(col);
    }
    // Liveness: each scan found the reads it exists to check.
    expect(drizzle.has("oracle_text")).toBe(true);
    expect(raw.has("color_identity")).toBe(true);
    const missing = [...drizzle, ...raw].filter((c) => !(FINGERPRINT_COLUMNS as readonly string[]).includes(c));
    expect([...new Set(missing)]).toEqual([]);
  });

  it("hashes every listed column", () => {
    const text = new PgDialect().sqlToQuery(catalogFingerprintSql).sql;
    for (const col of FINGERPRINT_COLUMNS) expect(text).toContain(col);
  });
});
