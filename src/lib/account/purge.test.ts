// The purge's COVERAGE, computed from the schema rather than listed by hand: a table added later that holds
// a player's rows fails here until the purge deletes it, cascades from something it deletes, or is kept on
// purpose with a reason. A list assembled by reading has a tail; this reads `schema.ts` every run.
import { readFileSync } from "node:fs";
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
    const bindingOf = new Map(tables.map((t) => [t.binding, t.name]));
    const blocked: string[] = [];
    for (const t of tables) {
      for (const ref of t.body.matchAll(/\.references\(\(\)(?:\s*:\s*\w+)?\s*=>\s*(\w+)\.\w+(\s*,\s*\{[^}]*\})?\)/g)) {
        const parent = bindingOf.get(ref[1]);
        if (!parent || !purged.has(parent)) continue;
        const onDelete = /onDelete:\s*"(cascade|set null)"/.test(ref[2] ?? "");
        // A child the purge deletes itself, BEFORE its parent, may reference it with no action.
        const deletedFirst = PURGE_ORDER.indexOf(t.name as never) !== -1
          && PURGE_ORDER.indexOf(t.name as never) < PURGE_ORDER.indexOf(parent as never);
        const selfRef = parent === t.name;
        if (!onDelete && !deletedFirst && !selfRef) blocked.push(`${t.name} -> ${parent}`);
      }
    }
    expect(blocked).toEqual([]);
  });
});
