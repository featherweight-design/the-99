// `admin_settings_key_check` against the keys the page writes (the admin cost-report plan, PR 2):
// every key in `SETTING_KEYS` must be allowed, in the schema AND in the newest migration that
// writes the constraint, or a save fails at the database. The retired `elsewhere_usd` stays
// allowed, so production's stored row stays valid. Read through `node:fs`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { adminSettings } from "../../db/schema";
import { SETTING_KEYS } from "./costs-rule";

const ALLOWED = [...SETTING_KEYS, "elsewhere_usd"];

function newestConstraintMigration(): { file: string; sql: string } {
  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort()
    .filter((f) => readFileSync(join(dir, f), "utf8").includes("admin_settings_key_check"));
  const file = files.at(-1)!;
  return { file, sql: readFileSync(join(dir, file), "utf8") };
}

describe("admin_settings_key_check", () => {
  it("allows every setting key, and the retired elsewhere_usd, in the schema", () => {
    const check = getTableConfig(adminSettings).checks.find((c) => c.name === "admin_settings_key_check")!;
    const text = new PgDialect().sqlToQuery(check.value).sql;
    for (const key of ALLOWED) expect(text).toContain(`'${key}'`);
  });

  it("is written with every key by the newest migration that touches it, which is not the table's first", () => {
    const { file, sql } = newestConstraintMigration();
    expect(file).not.toBe("0101_admin_costs.sql");
    expect(sql).toContain('DROP CONSTRAINT "admin_settings_key_check"');
    const add = sql.slice(sql.indexOf('ADD CONSTRAINT "admin_settings_key_check"'));
    for (const key of ALLOWED) expect(add).toContain(`'${key}'`);
  });
});
