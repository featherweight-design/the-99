// A group's create and save (admin plan 9a), over a recording transaction: the lock comes first,
// a no-op writes nothing, a rise in model access returns the confirm preview, a move records
// removed-then-added, a taken name is refused, and the memo is cleared only after a commit. Also pins
// who may import the write.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { riseBetween } from "../switches/explain";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../model/allowance", () => ({ dailyLimitsFor: async (_q: unknown, ids: string[]) => new Map(ids.map((id) => [id, 5])) }));

const { writeGroup } = await import("./group-writes");

const T = "11111111-1111-4111-8111-111111111111";
const F = "22222222-2222-4222-8222-222222222222";
const NEW = "33333333-3333-4333-8333-333333333333";
const dialect = new PgDialect();
const log: { text: string; params: unknown[] }[] = [];
let overrides: OverrideRow[] = [];
let members: { userId: string; groupId: string }[] = [];
let group: { id: string; name: string; description: string | null; daily_allowance: number | null } | null = null;
let nameTaken = false;
let failOn: RegExp | null = null;
let failCode: string | null = null;

const tx = {
  execute: async (q: SQL) => {
    const { sql: raw, params } = dialect.sqlToQuery(q);
    const text = raw.replace(/\s+/g, " ").trim();
    log.push({ text, params });
    if (failOn?.test(text)) throw Object.assign(new Error("boom"), failCode ? { code: failCode } : {});
    if (text.startsWith("select id, name, description, daily_allowance from flag_groups")) return { rows: group ? [group] : [] };
    if (text.startsWith("select 1 from flag_groups")) return { rows: nameTaken ? [{}] : [] };
    if (text.includes("json_agg")) return { rows: [{ overrides, members }] };
    return { rows: [] };
  },
};

const order: string[] = [];
const transaction = vi.fn(async <R,>(fn: (t: typeof tx) => Promise<R>) => {
  order.push("begin");
  const out = await fn(tx);
  order.push("commit");
  return out;
});
const afterCommit = vi.fn(() => order.push("afterCommit"));
let env: Record<string, string> = {};
let clerk: "ok" | "down" = "ok";
const deps = () => ({
  accounts: async () => ({
    accounts: clerk === "down" ? [{ id: "u_hugh", name: null, email: null }] : [{ id: "u_hugh", name: "Hugh", email: null }, { id: "u_theo", name: "Theo", email: null }, { id: "u_jun", name: "Jun", email: null }],
    clerk,
  }),
  rise: (before: SwitchSnapshot, after: SwitchSnapshot, ids: readonly string[]) => riseBetween(env as NodeJS.ProcessEnv, before, after, ids),
  transaction: transaction as never,
  afterCommit,
  newId: () => NEW,
});

beforeEach(() => {
  log.length = 0;
  order.length = 0;
  overrides = [];
  members = [];
  group = { id: T, name: "testers", description: null, daily_allowance: null };
  nameTaken = false;
  failOn = null;
  failCode = null;
  env = {};
  clerk = "ok";
  transaction.mockClear();
  afterCommit.mockClear();
});

const kinds = () =>
  log.map(({ text }) =>
    text.includes("pg_advisory") ? "lock"
    : text.startsWith("select id, name") ? "group"
    : text.includes("json_agg") ? "snapshot"
    : text.startsWith("select 1 from flag_groups") ? "name"
    : text.startsWith("insert into flag_groups") ? "create"
    : text.startsWith("update flag_groups") ? "update"
    : text.startsWith("delete from flag_group_members") ? "remove"
    : text.startsWith("insert into flag_group_members") ? "add"
    : text.startsWith("insert into admin_events") ? "event"
    : text.includes("model_calls") ? "mean"
    : text,
  );
const events = () => log.filter((l) => l.text.startsWith("insert into admin_events")).map((l) => [l.params[1], l.params[2], l.params[3]]);
const input = (over: Record<string, unknown> = {}) => ({ name: "testers", description: null, dailyAllowance: null, members: [] as string[], ...over });

describe("writeGroup", () => {
  it("locks first, reads the group for update, and writes nothing for a save that changes nothing", async () => {
    members = [{ userId: "u_hugh", groupId: T }];
    expect(await writeGroup("u_hugh", T, input({ members: ["u_hugh"] }), deps())).toEqual({ ok: true, id: T });
    expect(kinds()).toEqual(["lock", "group", "snapshot"]);
    expect(log[1].text).toContain("for update");
    expect(afterCommit).not.toHaveBeenCalled();
  });

  it("creates a group with a fresh id, records group_created first, and clears the memo only after the commit", async () => {
    group = null;
    const r = await writeGroup("u_hugh", null, input({ name: "beta", description: "Hugh plus one", members: ["u_jun"] }), deps());
    expect(r).toEqual({ ok: true, id: NEW });
    expect(kinds()).toEqual(["lock", "snapshot", "name", "create", "add", "event", "event", "event"]);
    expect(events()).toEqual([
      ["group_created", NEW, null],
      ["group_described", NEW, null],
      ["member_added", NEW, "u_jun"],
    ]);
    expect(order).toEqual(["begin", "commit", "afterCommit"]);
  });

  it("records a move as member_removed on the old group, then member_added here, and a removal", async () => {
    members = [
      { userId: "u_hugh", groupId: T },
      { userId: "u_theo", groupId: F },
    ];
    expect(await writeGroup("u_hugh", T, input({ members: ["u_theo"] }), deps())).toEqual({ ok: true, id: T });
    expect(kinds()).toEqual(["lock", "group", "snapshot", "remove", "add", "event", "event", "event"]);
    expect(events()).toEqual([
      ["member_removed", T, "u_hugh"],
      ["member_removed", F, "u_theo"],
      ["member_added", T, "u_theo"],
    ]);
    // One row per account: the add replaces the row the move left.
    expect(log.find((l) => l.text.startsWith("insert into flag_group_members"))!.text).toContain("on conflict (user_id) do update");
  });

  it("refuses a name another group holds, with nothing written", async () => {
    nameTaken = true;
    expect(await writeGroup("u_hugh", T, input({ name: "friends" }), deps())).toEqual({ ok: false, error: "name" });
    expect(kinds()).toEqual(["lock", "group", "snapshot", "name"]);
    expect(afterCommit).not.toHaveBeenCalled();
    // A unique violation the check missed is the same refusal.
    nameTaken = false;
    failOn = /^update flag_groups/;
    failCode = "23505";
    expect(await writeGroup("u_hugh", T, input({ name: "friends" }), deps())).toEqual({ ok: false, error: "name" });
  });

  it("returns a preview instead of writing when a move raises model access, and writes once confirmed", async () => {
    env = { HELP_ME_CHOOSE_ENABLED: "false" };
    overrides = [{ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "group", groupId: T, userId: null, value: "on" }];
    members = [{ userId: "u_theo", groupId: F }];
    const r = await writeGroup("u_hugh", T, input({ members: ["u_theo"] }), deps());
    expect(r).toMatchObject({ ok: false, error: "confirm", preview: { count: 1, names: ["Theo"], costs: [{ key: "intake" }] } });
    // The check runs after the writes, so the rollback (the probe proves it) is what writes nothing.
    expect(kinds()).not.toContain("event");
    expect(afterCommit).not.toHaveBeenCalled();
    log.length = 0;
    expect(await writeGroup("u_hugh", T, input({ members: ["u_theo"], confirmed: 1 }), deps())).toEqual({ ok: true, id: T });
    expect(kinds()).toContain("add");
  });

  it("refuses a member outside the universe, and while Clerk is down still counts a member the stored ids miss", async () => {
    expect(await writeGroup("u_hugh", T, input({ members: ["u_stranger"] }), deps())).toEqual({ ok: false, error: "members" });
    clerk = "down";
    env = { HELP_ME_CHOOSE_ENABLED: "true" };
    overrides = [{ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "group", groupId: T, userId: null, value: "off" }];
    // u_ghost never pressed, so the Clerk-down list lacks it; its membership of T names it. Removing it
    // lifts T's off, so the rise is counted and confirmed rather than written unasked.
    members = [{ userId: "u_ghost", groupId: T }];
    expect(await writeGroup("u_hugh", T, input({ members: [] }), deps())).toMatchObject({ ok: false, error: "confirm", preview: { count: 1 } });
  });

  it("refuses before any transaction: a bad name, or an id that is not a uuid", async () => {
    expect(await writeGroup("u_hugh", T, input({ name: "Bad Name" }), deps())).toEqual({ ok: false, error: "nameRule" });
    expect(await writeGroup("u_hugh", "nope", input(), deps())).toEqual({ ok: false, error: "group" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a group that no longer exists", async () => {
    group = null;
    expect(await writeGroup("u_hugh", T, input(), deps())).toEqual({ ok: false, error: "group" });
    expect(kinds()).toEqual(["lock", "group"]);
  });

  it("says nothing changed when the transaction throws, and clears no memo", async () => {
    members = [];
    failOn = /^insert into admin_events/;
    expect(await writeGroup("u_hugh", T, input({ members: ["u_jun"] }), deps())).toEqual({ ok: false, error: "failed" });
    expect(afterCommit).not.toHaveBeenCalled();
  });
});

describe("who may import the group write", () => {
  const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((e) => {
      const p = join(dir, e);
      return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(e) && !/\.test\.tsx?$/.test(e) ? [p] : [];
    });

  it("is src/app/admin/** alone, and the shared rise check only the two writes", () => {
    const importers = (mod: string) =>
      files(SRC)
        // A type-only import carries no code, so a component may take the result's shape.
        .filter((f) => new RegExp(`^\\s*(import|export)(?!\\s+type\\b)[^;]*?from\\s+["'][^"']*/${mod}["']`, "m").test(readFileSync(f, "utf8")))
        .map((f) => relative(SRC, f));
    expect(importers("group-writes")).toEqual([join("app", "admin", "groups", "actions.ts")]);
    expect(importers("rise-confirm").sort()).toEqual([join("lib", "admin", "group-writes.ts"), join("lib", "admin", "switch-writes.ts")]);
  });
});
