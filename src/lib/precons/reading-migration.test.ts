// Small items 5, PR 6a: migration 0185 adds the precon reading's columns, all nullable (a row written
// before them, or a precon whose reading cannot be built, holds none), and nothing else.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { preconSynopses } from "../../db/schema";

const MIGRATION = join(process.cwd(), "drizzle/0185_precon_synopses_reading.sql");
const COLUMNS: Record<string, string> = {
  reading: "jsonb", reading_permits: "integer[]", reading_list: "text", reading_catalog: "text",
  reading_profile_version: "integer", reading_rules_version: "integer", reading_analyzed_oracle_ids: "uuid[]",
  reading_seen_seq: "bigint", reading_at: "timestamp",
};

describe("migration 0185_precon_synopses_reading", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);

  it("adds each reading column to precon_synopses, nullable, and does nothing else", () => {
    expect(statements).toEqual(Object.entries(COLUMNS).map(([c, t]) => `ALTER TABLE "precon_synopses" ADD COLUMN "${c}" ${t};`));
  });

  it("is in the journal", () => {
    const journal = JSON.parse(readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as { entries: { tag: string }[] };
    expect(journal.entries.map((e) => e.tag)).toContain("0185_precon_synopses_reading");
  });

  it("matches the schema: the same columns, none required", () => {
    const cols = getTableConfig(preconSynopses).columns.filter((c) => c.name.startsWith("reading"));
    expect(cols.map((c) => c.name).sort()).toEqual(Object.keys(COLUMNS).sort());
    expect(cols.every((c) => !c.notNull)).toBe(true);
  });
});
