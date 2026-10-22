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
  it("restamps created_at on a refresh or takeover, so the trim keeps the row just saved", async () => {
    let conflict: { set: Record<string, unknown> } | null = null;
    const q = {
      insert: () => ({ values: () => ({ onConflictDoUpdate: async (c: { set: Record<string, unknown> }) => { conflict = c; } }) }),
      execute: vi.fn(async () => undefined),
    };
    await saveDevice("u1", { endpoint: "https://fcm.googleapis.com/x", p256dh: "p", auth: "a", userAgent: "ua", timeZone: "UTC" }, q as never);
    expect(conflict!.set).toHaveProperty("createdAt");
    expect(q.execute).toHaveBeenCalledOnce(); // the trim runs after the save
  });
});
