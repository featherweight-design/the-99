// The override write's transaction (admin plan 8c, "The write, in order"), over a recording
// transaction: the order of its statements, what a refusal, a confirm and a no-op leave unwritten, and
// that the memo is cleared only after a commit. Also pins who may import the write.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SWITCH_NAMES, type SwitchName } from "../switches/registry";
import { riseBetween } from "../switches/explain";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../model/allowance", () => ({ dailyLimitFor: () => 5 }));

const { writeOverride } = await import("./switch-writes");

const G = "0b6f2c1e-3c1a-4d55-9a3e-1f2d3c4b5a69";
const dialect = new PgDialect();
const log: string[] = [];
let overrides: OverrideRow[] = [];
let members: { userId: string; groupId: string }[] = [];
let current: { value: string; note: string | null } | null = null;
let groupExists = true;
let failOn: RegExp | null = null;

const tx = {
  execute: async (q: SQL) => {
    const text = dialect.sqlToQuery(q).sql.replace(/\s+/g, " ").trim();
    log.push(text);
    if (failOn?.test(text)) throw new Error("boom");
    if (text.includes("pg_advisory_xact_lock")) return { rows: [] };
    if (text.startsWith("select id from flag_groups")) return { rows: groupExists ? [{ id: G }] : [] };
    if (text.includes("json_agg")) return { rows: [{ overrides, members }] };
    if (text.startsWith("select value, note from flag_overrides")) return { rows: current ? [current] : [] };
    if (text.includes("from model_calls")) return { rows: [] };
    return { rows: [] };
  },
};

const order: string[] = [];
const transaction = vi.fn(async <T,>(fn: (t: typeof tx) => Promise<T>) => {
  order.push("begin");
  const out = await fn(tx);
  order.push("commit");
  return out;
});
const afterCommit = vi.fn(() => order.push("afterCommit"));
type Env = Partial<Record<SwitchName, string>>;
let env: Env = {};
const deps = () => ({
  accounts: async () => ({ accounts: [{ id: "u1", name: "Hugh", email: null }, { id: "u2", name: "Mara", email: null }] }),
  env: () => Object.fromEntries(SWITCH_NAMES.map((n) => [n, env[n] ?? null])) as Record<SwitchName, string | null>,
  rise: (before: SwitchSnapshot, after: SwitchSnapshot, ids: readonly string[]) => riseBetween(env as NodeJS.ProcessEnv, before, after, ids),
  transaction: transaction as never,
  afterCommit,
});

beforeEach(() => {
  log.length = 0;
  order.length = 0;
  overrides = [];
  members = [];
  current = null;
  groupExists = true;
  failOn = null;
  env = {};
  transaction.mockClear();
  afterCommit.mockClear();
});

const kinds = () =>
  log.map((s) =>
    s.includes("pg_advisory") ? "lock" : s.startsWith("select id from flag_groups") ? "group" : s.includes("json_agg") ? "snapshot" : s.startsWith("select value") ? "target" : s.startsWith("insert into flag_overrides") ? "upsert" : s.startsWith("delete from flag_overrides") ? "delete" : s.startsWith("insert into admin_events") ? "event" : s.includes("model_calls") ? "mean" : s,
  );

describe("writeOverride", () => {
  it("locks, reads, mutates, then records the event, and clears the memo only after the commit", async () => {
    const r = await writeOverride("u1", "set", { switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "u2", value: "on", note: "try it" }, deps());
    expect(r).toEqual({ ok: true });
    expect(kinds()).toEqual(["lock", "snapshot", "target", "upsert", "event"]);
    expect(log.at(-1)).toContain("insert into admin_events");
    expect(order).toEqual(["begin", "commit", "afterCommit"]);
  });

  it("reads a group for share before anything else, and refuses one that does not exist", async () => {
    groupExists = false;
    expect(await writeOverride("u1", "set", { switchName: "DECK_NOTES_ENABLED", scope: "group", groupId: G, value: "on" }, deps())).toEqual({ ok: false, error: "group" });
    expect(kinds()).toEqual(["lock", "group"]);
    expect(log[1]).toContain("for share");
    expect(afterCommit).not.toHaveBeenCalled();
  });

  it("deletes on a clear and records the old value", async () => {
    current = { value: "off", note: null };
    expect(await writeOverride("u1", "clear", { switchName: "DECK_NOTES_ENABLED", scope: "app" }, deps())).toEqual({ ok: true });
    expect(kinds()).toEqual(["lock", "snapshot", "target", "delete", "event"]);
    expect(afterCommit).toHaveBeenCalledOnce();
  });

  it("writes nothing for a no-op and clears no memo", async () => {
    current = { value: "on", note: null };
    expect(await writeOverride("u1", "set", { switchName: "DECK_NOTES_ENABLED", scope: "app", value: "on" }, deps())).toEqual({ ok: true });
    expect(kinds()).toEqual(["lock", "snapshot", "target"]);
    expect(afterCommit).not.toHaveBeenCalled();
  });

  it("refuses before any transaction, and clears no memo", async () => {
    env = { DECK_NOTES_ENABLED: "off" };
    expect(await writeOverride("u1", "set", { switchName: "DECK_NOTES_ENABLED", scope: "app", value: "on" }, deps())).toEqual({ ok: false, error: "killed" });
    expect(await writeOverride("u1", "set", { switchName: "LIST_CACHE_ENABLED", scope: "user", targetUserId: "u1", value: "on" }, deps())).toEqual({ ok: false, error: "plumbing" });
    expect(transaction).not.toHaveBeenCalled();
    expect(afterCommit).not.toHaveBeenCalled();
  });

  it("returns a preview instead of writing when a model capability rises unconfirmed, and writes once the count is confirmed", async () => {
    env = { HELP_ME_CHOOSE_ENABLED: "true" };
    overrides = [{ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", groupId: null, userId: null, value: "off" }];
    current = { value: "off", note: null };
    const r = await writeOverride("u1", "clear", { switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app" }, deps());
    expect(r).toMatchObject({ ok: false, error: "confirm", preview: { count: 2, names: ["Hugh", "Mara"], credits: [5], costs: [{ key: "intake", meanMicroUsd: null }] } });
    expect(kinds()).not.toContain("delete");
    expect(afterCommit).not.toHaveBeenCalled();

    log.length = 0;
    // A stale count (the dialog said 1) gets a fresh preview, not a write.
    expect(await writeOverride("u1", "clear", { switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", confirmed: 1 }, deps())).toMatchObject({ error: "confirm" });
    log.length = 0;
    expect(await writeOverride("u1", "clear", { switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", confirmed: 2 }, deps())).toEqual({ ok: true });
    expect(kinds()).toEqual(["lock", "snapshot", "target", "delete", "event"]);
  });

  it("refuses a write that raises model access for an unlisted account while Clerk is down", async () => {
    env = { HELP_ME_CHOOSE_ENABLED: "true" };
    overrides = [{ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", groupId: null, userId: null, value: "off" }];
    current = { value: "off", note: null };
    const down = { ...deps(), accounts: async () => ({ accounts: [{ id: "u1", name: "Hugh", email: null }], clerk: "down" as const }) };
    expect(await writeOverride("u1", "clear", { switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", confirmed: 1 }, down)).toEqual({ ok: false, error: "accounts" });
    expect(kinds()).not.toContain("delete");
    // An account's own override touches only that listed account, so it is counted and confirmed as usual.
    log.length = 0;
    current = null;
    expect(await writeOverride("u1", "set", { switchName: "HELP_ME_CHOOSE_ENABLED", scope: "user", targetUserId: "u1", value: "on", confirmed: 1 }, down)).toEqual({ ok: true });
  });

  it("counts a group member the fallback list misses while Clerk is down", async () => {
    env = { HELP_ME_CHOOSE_ENABLED: "true" };
    members = [{ userId: "u9", groupId: G }];
    overrides = [{ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", groupId: null, userId: null, value: "off" }];
    const down = { ...deps(), accounts: async () => ({ accounts: [{ id: "u1", name: "Hugh", email: null }], clerk: "down" as const }) };
    const r = await writeOverride("u1", "set", { switchName: "HELP_ME_CHOOSE_ENABLED", scope: "group", groupId: G, value: "on" }, down);
    expect(r).toMatchObject({ ok: false, error: "confirm", preview: { count: 1, names: ["u9"] } });
  });

  it("says nothing changed when the transaction throws, and clears no memo", async () => {
    failOn = /^insert into admin_events/;
    expect(await writeOverride("u1", "set", { switchName: "DECK_NOTES_ENABLED", scope: "app", value: "on" }, deps())).toEqual({ ok: false, error: "failed" });
    expect(afterCommit).not.toHaveBeenCalled();
  });
});

describe("who may import the write", () => {
  const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((e) => {
      const p = join(dir, e);
      return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(e) && !/\.test\.tsx?$/.test(e) ? [p] : [];
    });

  it("is src/app/admin/** alone, so nothing reaches it past requireAdmin()", () => {
    const importers = files(SRC)
      // A type-only import carries no code, so a component may take the result's shape.
      .filter((f) => /^\s*(import|export)(?!\s+type\b)[^;]*?from\s+["'][^"']*\/switch-writes["']/m.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(importers.length).toBeGreaterThan(0);
    expect(importers.filter((f) => !f.startsWith(join("app", "admin")))).toEqual([]);
  });
});
