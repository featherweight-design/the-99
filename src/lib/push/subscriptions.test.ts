import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

import { MAX_DEVICES, saveDevice, trimDevices } from "./subscriptions";
import { pushKindsUpdate } from "./prefs";
import type { SQL } from "drizzle-orm";

const dialect = new PgDialect();
const render = (q: SQL) => dialect.sqlToQuery(q);

describe("the trim", () => {
  it("aliases the inner table and qualifies both sides of the subquery", async () => {
    let seen: SQL | null = null;
    await trimDevices("u1", { execute: vi.fn(async (q: SQL) => { seen = q; }) } as never);
    const { sql: text, params } = render(seen!);
    expect(text).toContain("delete from push_subscriptions ps");
    expect(text).toContain("inner_ps.user_id =");
    expect(text).toContain("ps.id in (");
    expect(text).toContain("offset");
    expect(params).toEqual(["u1", "u1", MAX_DEVICES]);
  });
});

describe("the guarded prefs write", () => {
  it("renders against the push columns, never the feed's", () => {
    const q = pushKindsUpdate("u1", { pushKinds: { combo: "2026-10-22T00:00:00.000Z" }, declined: ["spare-request"] }, { map: {}, declined: [] }).toSQL();
    expect(q.sql).toContain('"push_kinds"');
    expect(q.sql).toContain('"push_kinds_declined"');
    expect(q.sql).not.toContain('"feed_kinds"');
    expect(q.sql).toContain('"user_prefs"."push_kinds" =');
  });
});

describe("saveDevice", () => {
  const device = { endpoint: "https://fcm.googleapis.com/x", p256dh: "p", auth: "a", userAgent: "ua", timeZone: "UTC" };

  function fake() {
    const calls: string[] = [];
    let conflict: { set: Record<string, unknown> } | null = null;
    const tx = {
      execute: vi.fn(async (q: SQL) => { calls.push(dialect.sqlToQuery(q).sql.includes("pg_advisory_xact_lock") ? "lock" : "trim"); }),
      insert: () => ({ values: () => ({ onConflictDoUpdate: async (c: { set: Record<string, unknown> }) => { calls.push("upsert"); conflict = c; } }) }),
    };
    const q = { transaction: async (fn: (t: typeof tx) => Promise<void>) => { calls.push("begin"); await fn(tx); calls.push("commit"); } };
    return { q, calls, conflict: () => conflict };
  }

  it("takes the reader's lock first and holds it through the upsert and the trim, in one transaction", async () => {
    const f = fake();
    await saveDevice("u1", device, f.q as never);
    expect(f.calls).toEqual(["begin", "lock", "upsert", "trim", "commit"]);
  });

  it("runs the whole transaction again after a deadlock, and gives up after three", async () => {
    const f = fake();
    let n = 0;
    const flaky = { transaction: async (fn: never) => { if (++n === 1) throw Object.assign(new Error("deadlock detected"), { code: "40P01" }); return f.q.transaction(fn); } };
    await saveDevice("u1", device, flaky as never);
    expect(n).toBe(2);
    expect(f.calls).toEqual(["begin", "lock", "upsert", "trim", "commit"]);

    let m = 0;
    const always = { transaction: async () => { m++; throw Object.assign(new Error("deadlock detected"), { code: "40P01" }); } };
    await expect(saveDevice("u1", device, always as never)).rejects.toThrow("deadlock");
    expect(m).toBe(3);
  });

  it("sees a deadlock the driver's error carries on its cause, as Drizzle wraps it", async () => {
    const f = fake();
    let n = 0;
    const wrapped = { transaction: async (fn: never) => { if (++n === 1) throw new Error("Failed query", { cause: Object.assign(new Error("deadlock detected"), { code: "40P01" }) }); return f.q.transaction(fn); } };
    await saveDevice("u1", device, wrapped as never);
    expect(n).toBe(2);
  });

  it("does not retry an error that is not a deadlock", async () => {
    let n = 0;
    const broken = { transaction: async () => { n++; throw new Error("boom"); } };
    await expect(saveDevice("u1", device, broken as never)).rejects.toThrow("boom");
    expect(n).toBe(1);
  });

  it("restamps created_at on a refresh or takeover, so the trim keeps the row just saved", async () => {
    const f = fake();
    await saveDevice("u1", device, f.q as never);
    expect(f.conflict()!.set).toHaveProperty("createdAt");
  });
});
