import { getTableName, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "../../../src/db/schema";
import {
  FK_CHILDREN, KEPT, NO_KEY_PERSONAL, NOT_IN_SCHEMA, USER_KEYED, assertOnlyFixtureRows, guardStatement, keptDeleteStatements,
  purgeEverything, purgedTables, truncateStatement,
} from "./purge";

const tables: PgTable[] = Object.values(schema as Record<string, unknown>).filter((t) => is(t, PgTable)) as PgTable[];
const USER_COLUMN = /(^|_)user_id$|^clerk_id$/;

describe("the purge lists against the Drizzle schema", () => {
  const userColumns = new Map<string, string[]>();
  for (const t of tables) {
    const cols = getTableConfig(t).columns.map((c) => c.name).filter((n) => USER_COLUMN.test(n));
    if (cols.length) userColumns.set(getTableName(t), cols.sort());
  }

  it("lists every table that has a user-id column, with exactly its user columns", () => {
    const listed = Object.fromEntries(
      Object.entries(USER_KEYED).filter(([t]) => !NOT_IN_SCHEMA.includes(t)).map(([t, c]) => [t, [...c].sort()]),
    );
    // A new table with a user column fails here until it is purged (USER_KEYED) or kept with a reason (KEPT).
    expect(Object.fromEntries(userColumns)).toEqual(listed);
  });

  it("keeps a table only with a reason, and only one that is user-keyed", () => {
    for (const [t, why] of Object.entries(KEPT)) {
      expect(USER_KEYED[t]).toBeDefined();
      expect(why.length).toBeGreaterThan(20);
    }
  });

  it("names every table a foreign key reaches from a user table, and no table that is not there", () => {
    const names = new Set(tables.map((t) => getTableName(t)));
    const children = new Map<string, string[]>(); // parent -> tables referencing it
    for (const t of tables) {
      for (const fk of getTableConfig(t).foreignKeys) {
        const parent = getTableName(fk.reference().foreignTable);
        children.set(parent, [...(children.get(parent) ?? []), getTableName(t)]);
      }
    }
    const reached = new Set<string>();
    const walk = (t: string) => {
      for (const c of children.get(t) ?? []) if (!reached.has(c)) { reached.add(c); walk(c); }
    };
    for (const t of Object.keys(USER_KEYED)) if (names.has(t)) walk(t);
    const purged = new Set(purgedTables());
    for (const t of Object.keys(KEPT)) purged.add(t);
    expect([...reached].filter((t) => !purged.has(t))).toEqual([]);
    for (const t of [...FK_CHILDREN, ...NO_KEY_PERSONAL]) expect(names.has(t)).toBe(true);
  });
});

describe("the purge statements", () => {
  it("empties every purged table in ONE truncate, so a table left out fails in Postgres instead of being skipped", () => {
    const sql = truncateStatement(purgedTables());
    expect(sql.startsWith('truncate table "')).toBe(true);
    expect(sql.match(/truncate/g)).toHaveLength(1);
    for (const t of purgedTables()) expect(sql).toContain(`"${t}"`);
    expect(sql).not.toMatch(/cascade/i);
  });

  it("never truncates a catalog table or an app-wide switch row", () => {
    const purged = new Set(purgedTables());
    for (const t of ["cards", "printings", "printing_prices", "commander_support", "commander_support_cards", "sets", "flag_overrides", "flag_groups"]) {
      expect(purged.has(t)).toBe(false);
    }
    expect(keptDeleteStatements()).toEqual(['delete from "flag_overrides" where "user_id" is not null']);
  });

  it("refuses an identifier that is not a plain table name", () => {
    expect(() => truncateStatement(['decks"; drop table cards; --'])).toThrow();
    expect(() => truncateStatement([])).toThrow();
  });

  it("builds the guard from the user columns of each table", () => {
    expect(guardStatement("friend_links")).toContain('"user_id" <> all($1::text[])');
    expect(guardStatement("friend_links")).toContain('"friend_user_id" <> all($1::text[])');
    expect(() => guardStatement("cards")).toThrow();
  });

  it("runs the purge then the kept deletes, and the guard reads every user table", async () => {
    const seen: string[] = [];
    const has = async (text: string) => (seen.push(text), text.includes("pg_class") ? NOT_IN_SCHEMA.map((relname) => ({ relname })) : []);
    await purgeEverything(has);
    expect(seen[0]).toMatch(/pg_class/);
    expect(seen[1]).toMatch(/^truncate/);
    expect(seen[1]).toContain("collection_items_backup_20260915");
    expect(seen.slice(2)).toEqual(keptDeleteStatements());
    const guards: string[] = [];
    await assertOnlyFixtureRows(async (text) => (guards.push(text), text.includes("pg_class") ? NOT_IN_SCHEMA.map((relname) => ({ relname })) : [{ n: 0 }]), ["user_fixture"]);
    expect(guards.filter((g) => g.includes("<> all")).length).toBe(Object.keys(USER_KEYED).length);
  });

  it("skips a not-in-schema table the branch does not have, in the purge and the guard", async () => {
    const seen: string[] = [];
    await purgeEverything(async (text) => (seen.push(text), []));
    expect(seen[1]).not.toContain("collection_items_backup_20260915");
    const guards: string[] = [];
    await assertOnlyFixtureRows(async (text) => (guards.push(text), text.includes("pg_class") ? [] : [{ n: 0 }]), ["user_fixture"]);
    expect(guards.some((g) => g.includes("collection_items_backup_20260915"))).toBe(false);
  });

  it("throws when a row the fixture does not own remains", async () => {
    await expect(
      assertOnlyFixtureRows(async (text) => (text.includes("pg_class") ? [] : [{ n: text.includes('from "decks"') ? 3 : 0 }]), ["user_fixture"]),
    ).rejects.toThrow(/decks: 3/);
  });
});
