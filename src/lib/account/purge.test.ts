// The purge's COVERAGE, computed from the schema rather than listed by hand: a table added later that holds
// a player's rows fails here until the purge deletes it, cascades from something it deletes, or is kept on
// purpose with a reason. A list assembled by reading has a tail; this reads `schema.ts` every run.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PURGE_ORDER } from "./purge";
import { SOCIAL_PURGED } from "../social/purge";

const schema = readFileSync("src/db/schema.ts", "utf8");

/** Columns that name an account. */
const ACCOUNT_COLUMNS = ["user_id", "owner_user_id", "inviter_user_id", "friend_user_id", "redeemed_by", "actor_id", "updated_by"];

/** Tables holding an account column the purge deliberately leaves, and why. */
const KEPT: Record<string, string> = {
  admin_settings: "updated_by is the admin who changed a setting: the admin's own audit trail, not the player's data",
};

type Table = { binding: string; name: string; body: string };
const tables: Table[] = (() => {
  const starts = [...schema.matchAll(/export const (\w+) = pgTable\(\s*"(\w+)"/g)];
  return starts.map((m, i) => ({
    binding: m[1],
    name: m[2],
    body: schema.slice(m.index, starts[i + 1]?.index ?? schema.length),
  }));
})();
const accountColumns = (t: Table) => ACCOUNT_COLUMNS.filter((c) => new RegExp(`\\(\\s*"${c}"`).test(t.body));

const purged = new Set<string>([...PURGE_ORDER, ...SOCIAL_PURGED, "user_data_stamps"]);

type Fk = { name: string; tableFrom: string; tableTo: string; onDelete?: string };
type Snapshot = { tables: Record<string, { name: string; foreignKeys: Record<string, Fk> }> };

/** The newest generated snapshot: every foreign key the migrations declare, whatever form wrote it. */
function latestSnapshot(): Snapshot {
  const last = readdirSync("drizzle/meta").filter((f) => /^\d{4}_snapshot\.json$/.test(f)).sort().at(-1)!;
  return JSON.parse(readFileSync(`drizzle/meta/${last}`, "utf8"));
}

/**
 * `child -> parent` for each FK into a table the purge EMPTIES of the account's rows (a listed table, or any
 * table reached from one by cascade, transitively) that neither cascades, sets null, nor is deleted first.
 */
function fkBlocks(snap: Snapshot, listed: ReadonlySet<string> = purged): string[] {
  const order = PURGE_ORDER as readonly string[];
  const fks = Object.values(snap.tables).flatMap((t) => Object.values(t.foreignKeys));
  const reached = new Set(listed);
  for (let grew = true; grew; ) {
    grew = false;
    for (const fk of fks) {
      if (fk.onDelete === "cascade" && reached.has(fk.tableTo) && !reached.has(fk.tableFrom)) {
        reached.add(fk.tableFrom);
        grew = true;
      }
    }
  }
  const out: string[] = [];
  for (const fk of fks) {
    if (!reached.has(fk.tableTo) || fk.tableTo === fk.tableFrom) continue;
    if (fk.onDelete === "cascade" || fk.onDelete === "set null") continue;
    const child = order.indexOf(fk.tableFrom);
    if (child !== -1 && child < order.indexOf(fk.tableTo)) continue;
    out.push(`${fk.tableFrom} -> ${fk.tableTo}`);
  }
  return out;
}

describe("the account purge's coverage", () => {
  it("reads the schema it claims to (the parse found the tables)", () => {
    expect(tables.length).toBeGreaterThan(50);
    expect(tables.find((t) => t.name === "decks")).toBeDefined();
  });

  it("deletes, or keeps with a reason, every table holding an account column", () => {
    const missing = tables.filter((t) => accountColumns(t).length > 0 && !purged.has(t.name) && !(t.name in KEPT));
    expect(missing.map((t) => t.name)).toEqual([]);
  });

  it("deletes each PURGE_ORDER table by a user_id column it really has", () => {
    for (const name of PURGE_ORDER) {
      const t = tables.find((x) => x.name === name);
      expect(t, name).toBeDefined();
      expect(accountColumns(t!), name).toContain("user_id");
    }
  });

  it("names every table only once", () => {
    expect(new Set([...PURGE_ORDER, ...SOCIAL_PURGED]).size).toBe(PURGE_ORDER.length + SOCIAL_PURGED.length);
  });

  it("reaches every child of a purged table by cascade or set null, so no FK blocks or outlives it", () => {
    expect(fkBlocks(latestSnapshot())).toEqual([]);
  });

  it("reads every foreign key the migrations declare, the foreignKey() form included", () => {
    const fks = Object.values(latestSnapshot().tables).flatMap((t) => Object.values(t.foreignKeys));
    // `token_prices_printing_fk` is declared with `foreignKey({...})`, not `.references()`.
    expect(fks.map((f) => f.name)).toContain("token_prices_printing_fk");
    expect(fks.length).toBeGreaterThan(40);
  });

  it("follows cascades transitively: a grandchild with no on delete under a cascaded child is reported", () => {
    const snap = { tables: {
      "public.child": { name: "child", foreignKeys: { a: { name: "a", tableFrom: "child", tableTo: "decks", onDelete: "cascade" } } },
      "public.grandchild": { name: "grandchild", foreignKeys: { b: { name: "b", tableFrom: "grandchild", tableTo: "child", onDelete: "no action" } } },
    } };
    expect(fkBlocks(snap)).toEqual(["grandchild -> child"]);
  });

  it("fails a child of a purged table with no on delete, in either declaration form", () => {
    const snap = { tables: { "public.child": { name: "child", foreignKeys: { x: { name: "x", tableFrom: "child", tableTo: "decks", onDelete: "no action" } } } } };
    expect(fkBlocks(snap)).toEqual(["child -> decks"]);
  });
});
