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

  it("selects from one constant row LEFT JOINED to the reader's prefs, so a reader with no row is still decided", () => {
    expect(q).toMatch(/from \(select 1\) wone left join "user_prefs" wup on wup\.user_id = \$\d+ where /);
  });

  it("writes only while the kind is ON and the item is newer than its enabledAt (`kindEnabledAt`): a kind that is off is not written", () => {
    expect(q).toMatch(/where \(\$\d+::timestamptz > coalesce\(\(wup\.feed_kinds ->> \$\d+::text\)::timestamptz, case when \$\d+::text = any\(\$\d+::text\[\]\) and not \(\$\d+::text = any\(coalesce\(wup\.feed_kinds_declined, '\{\}'::text\[\]\)\)\) then '-infinity'::timestamptz end\)/);
    expect(params.filter((p) => p === "combo")).toHaveLength(11); // the row's kind, the feed stamp (x3), the push stamp (x3), and the outbox row's kind and its push stamp (x4)
    expect(params).toContainEqual(["spare-request", "secret-lair", "commander-decklists", "wizards-news"]);
  });

  it("also writes while the reader has a DEVICE and the item is newer than the kind's PUSH stamp, with the feed kind off", () => {
    expect(q).toMatch(/or \(exists \(select 1 from "push_subscriptions" wps where wps\.user_id = \$\d+\) and \$\d+::timestamptz > coalesce\(\(wup\.push_kinds ->> /);
    expect(q).toContain("wup.push_kinds_declined");
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
