import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

const kick = vi.hoisted(() => vi.fn());
vi.mock("../push/kick", () => ({ kickPush: kick }));

import { recordFeedItem, recordFeedItemQuery } from "./feed-write";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const input = { userId: "u1", kind: "price-drop" as const, dedupeKey: "k1", oracleId: "9a1412db-45ad-46ea-8f12-a85d203113d8", now: NOW };
const render = (i: typeof input & { batchKey?: string; friendUserId?: string }) => new PgDialect().sqlToQuery(recordFeedItemQuery(i as never));

describe("recordFeedItem queues its push in the SAME statement", () => {
  const r = render(input);

  it("is one statement: the feed insert and the outbox insert are CTEs of one query, so a committed item always has its push", () => {
    expect(r.sql.startsWith("with wrote as (")).toBe(true);
    expect(r.sql).toContain('insert into "feed_items"');
    expect(r.sql).toContain('pushed as (insert into "push_outbox"');
    expect(r.sql).toMatch(/returning id\),\s+pushed as/);
    // The statement also says whether it queued a push, which is what the kick reads.
    expect(r.sql.trimEnd().endsWith("select id, exists (select 1 from pushed) as pushed from wrote")).toBe(true);
    expect(r.sql).toMatch(/on conflict \(user_id, kind, item_key\) do nothing\s+returning id\)/);
  });

  it("queues only when the feed insert wrote a row, under the opaque item key and never the writer's dedupe key", () => {
    expect(r.sql).toContain("where exists (select 1 from wrote)");
    expect(r.sql).toContain("'item:' || (select wrote.id::text from wrote limit 1)");
    const outbox = r.sql.slice(r.sql.indexOf('pushed as (insert into "push_outbox"'));
    expect(outbox).not.toContain("dedupe_key");
  });

  it("judges the item and its push at ONE instant, even when the writer names none", () => {
    const { now: _omit, ...unstamped } = input;
    const stamps = render(unstamped as never).params.filter((p) => typeof p === "string" && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(p));
    expect(stamps.length).toBeGreaterThanOrEqual(2); // the feed row's, and the outbox row's (twice)
    expect(new Set(stamps).size).toBe(1);
  });

  it("passes the writer's own batch key on", () => {
    expect(render({ ...input, batchKey: "run-7" }).params).toContain("run-7");
  });

  it("is ONE call through whatever executor it is given, true only when the feed row was written", async () => {
    const wrote = { execute: vi.fn(async () => ({ rowCount: 1, rows: [{ id: "x" }] })) };
    expect(await recordFeedItem(wrote as never, input)).toBe(true);
    expect(wrote.execute).toHaveBeenCalledOnce();
    const none = { execute: vi.fn(async () => ({ rowCount: 0, rows: [] })) };
    expect(await recordFeedItem(none as never, input)).toBe(false);
    await expect(recordFeedItem(none as never, { ...input, oracleId: "nope" })).rejects.toThrow();
    expect(none.execute).toHaveBeenCalledOnce();
  });

  it("kicks a flush for the reader only when its statement queued a push", async () => {
    kick.mockClear();
    const pushed = { execute: vi.fn(async () => ({ rowCount: 1, rows: [{ id: "x", pushed: true }] })) };
    expect(await recordFeedItem(pushed as never, input)).toBe(true);
    expect(kick).toHaveBeenCalledExactlyOnceWith("u1");
    kick.mockClear();
    // Written to the feed, no device or the kind's push off: nothing to send, so no kick.
    const feedOnly = { execute: vi.fn(async () => ({ rowCount: 1, rows: [{ id: "x", pushed: false }] })) };
    expect(await recordFeedItem(feedOnly as never, input)).toBe(true);
    const none = { execute: vi.fn(async () => ({ rowCount: 0, rows: [] })) };
    expect(await recordFeedItem(none as never, input)).toBe(false);
    expect(kick).not.toHaveBeenCalled();
  });
});
