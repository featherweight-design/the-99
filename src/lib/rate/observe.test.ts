import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  env: { RATE_LIMIT_ENABLED: "true" } as Record<string, string | undefined>,
  envThrows: false,
  rows: [{ hits: 1 }] as { hits: number | string }[],
  executed: [] as unknown[],
  after: [] as (() => Promise<void>)[],
}));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => { h.after.push(fn); } }));
vi.mock("../switches/request", () => ({
  requestSwitchEnv: async () => { if (h.envThrows) throw new Error("outside a request"); return h.env; },
}));
vi.mock("../../db", () => ({ db: { execute: async (q: unknown) => { h.executed.push(q); return { rows: h.rows }; } } }));

import { PgDialect } from "drizzle-orm/pg-core";
import { observeHit, recordHit } from "./observe";

const flush = async () => { for (const fn of h.after.splice(0)) await fn(); };

beforeEach(() => {
  h.env = { RATE_LIMIT_ENABLED: "true" };
  h.envThrows = false;
  h.rows = [{ hits: 1 }];
  h.executed = [];
  h.after = [];
  vi.restoreAllMocks();
});

describe("recordHit", () => {
  it("upserts this window's row and sweeps the player's earlier windows in one statement", async () => {
    await recordHit("user_1", "card-detail", new Date("2026-10-13T12:00:30Z"));
    const { sql, params } = new PgDialect().sqlToQuery(h.executed[0] as never);
    expect(sql).toContain("delete from rate_hits");
    expect(sql).toMatch(/where \(user_id = \$\d+ and bucket = \$\d+ and window_start </);
    expect(sql).toContain("window_start <");
    // Anyone's rows past the retention go too, which bounds a row an in-flight hit writes after its account is purged.
    expect(sql).toMatch(/or\s+window_start </);
    expect(params).toContain("2026-10-13T11:00:00.000Z");
    expect(sql).toContain("on conflict (user_id, bucket, window_start) do update set hits = rate_hits.hits + 1");
    expect(params).toContain("user_1");
    expect(params).toContain("2026-10-13T12:00:00.000Z");
  });
  it("returns the window's count as a number", async () => {
    h.rows = [{ hits: "7" }];
    expect(await recordHit("user_1", "card-detail")).toBe(7);
  });
});

describe("observeHit", () => {
  it("writes nothing and schedules nothing while the switch is off", async () => {
    h.env = {};
    await observeHit("user_1", "card-detail");
    expect(h.after).toHaveLength(0);
    await flush();
    expect(h.executed).toHaveLength(0);
  });
  it("schedules the write after the response, and it blocks nothing: over the limit it only warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.rows = [{ hits: 241 }];
    await observeHit("user_1", "card-detail");
    expect(h.executed).toHaveLength(0); // nothing written inside the request
    await flush();
    expect(h.executed).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith("[rate] would refuse bucket=card-detail hits=241 limit=240");
  });
  it("counts a hit at the limit without warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.rows = [{ hits: 240 }];
    await observeHit("user_1", "card-detail");
    await flush();
    expect(h.executed).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });
  it("never names the player in the line it logs", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.rows = [{ hits: 999 }];
    await observeHit("user_secret", "card-detail");
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0].join(" "))).not.toContain("user_secret");
  });
  it("swallows a failed write and a switch read outside a request", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    h.rows = undefined as never;
    await observeHit("user_1", "draw-fields");
    await expect(flush()).resolves.toBeUndefined();
    h.envThrows = true;
    await expect(observeHit("user_1", "draw-fields")).resolves.toBeUndefined();
  });
});
