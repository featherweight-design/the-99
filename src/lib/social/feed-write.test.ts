import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { feedItemProblem, recordFeedItem, recordFeedItemQuery, type FeedItemInput } from "./feed-write";

const NOW = new Date("2026-10-22T12:00:00Z");
const CARD = "0b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const flat = (s: string) => s.replace(/\s+/g, " ");

describe("feedItemProblem", () => {
  it("accepts each stored kind with the subject it needs", () => {
    expect(feedItemProblem({ userId: "u", kind: "combo", dedupeKey: "v:1-2", variantId: "1-2" })).toBeNull();
    expect(feedItemProblem({ userId: "u", kind: "price-drop", dedupeKey: "c:w43", oracleId: CARD })).toBeNull();
    expect(feedItemProblem({ userId: "u", kind: "trade-match", dedupeKey: "f:c", oracleId: CARD, friendUserId: "f" })).toBeNull();
  });

  it("refuses a catalog kind, a missing subject, a self-naming friend and a bad key", () => {
    expect(feedItemProblem({ userId: "u", kind: "new-set" as never, dedupeKey: "x" })).toMatch(/not a stored kind/);
    expect(feedItemProblem({ userId: "u", kind: "combo", dedupeKey: "x" })).toMatch(/variant/);
    expect(feedItemProblem({ userId: "u", kind: "trade-match", dedupeKey: "x", oracleId: CARD })).toMatch(/friend/);
    expect(feedItemProblem({ userId: "u", kind: "trade-match", dedupeKey: "x", oracleId: CARD, friendUserId: "u" })).toMatch(/reader/);
    expect(feedItemProblem({ userId: "u", kind: "price-drop", dedupeKey: "", oracleId: CARD })).toMatch(/dedupe/);
    expect(feedItemProblem({ userId: "u", kind: "price-drop", dedupeKey: "x", oracleId: "nope" })).toMatch(/uuid/);
  });
});

describe("recordFeedItemQuery", () => {
  const { sql, params } = new PgDialect().sqlToQuery(recordFeedItemQuery({ userId: "u", kind: "combo", dedupeKey: "v:1-2", variantId: "1-2", now: NOW }));
  const q = flat(sql);

  it("inserts only while the kind is ON in the reader's own prefs row: a kind that is off is not written", () => {
    expect(q).toMatch(/from "user_prefs" wup where wup\.user_id = \$\d+ and \(wup\.feed_kinds ->> \$\d+\) is not null/);
    expect(params.filter((p) => p === "combo")).toHaveLength(3);
  });

  it("writes only an item newer than the kind's enabledAt, the bound the reader shows items by", () => {
    expect(q).toMatch(/and \$\d+::timestamptz > \(wup\.feed_kinds ->> \$\d+\)::timestamptz/);
  });

  it("names no friendship when the item names no friend", () => {
    expect(q).not.toContain("friend_links");
  });

  it("writes an item naming a friend only while the friendship stands, holding it FOR SHARE through the insert", () => {
    const named = flat(new PgDialect().sqlToQuery(recordFeedItemQuery({
      userId: "u", kind: "trade-match", dedupeKey: "c:f", oracleId: "00000000-0000-4000-8000-000000000001", friendUserId: "f", now: NOW,
    })).sql);
    expect(named).toMatch(/and exists \(select 1 from "friend_links" wfl where wfl\.user_id = \$\d+ and wfl\.friend_user_id = \$\d+ for share\)/);
  });

  it("writes the same event once (the dedupe key, per reader and kind)", () => {
    expect(q).toContain("on conflict (user_id, kind, dedupe_key) do nothing returning id");
  });

  it("dates the row at the event", () => {
    expect(params).toContain(NOW.toISOString());
  });
});

describe("recordFeedItem", () => {
  function recorder(rowCount: number) {
    const ran: SQL[] = [];
    return { tx: { execute: async (s: SQL) => { ran.push(s); return { rows: [], rowCount }; } } as never, ran };
  }
  const input: FeedItemInput = { userId: "u", kind: "combo", dedupeKey: "v:1-2", variantId: "1-2", now: NOW };

  it("says whether a row went in", async () => {
    expect(await recordFeedItem(recorder(1).tx, input)).toBe(true);
    expect(await recordFeedItem(recorder(0).tx, input)).toBe(false);
  });

  it("throws before any SQL on a malformed input", async () => {
    const { tx, ran } = recorder(1);
    await expect(recordFeedItem(tx, { ...input, variantId: null })).rejects.toThrow(/recordFeedItem: combo needs a variant/);
    expect(ran).toEqual([]);
  });
});
