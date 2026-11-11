import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { messagesFor, toMessage, type PushItem } from "./message";
import { exemptFromHold } from "./plan";
import {
  SALE_PUSH_GRACE_MS, SALE_PUSH_IGNORES_HOLD, SALE_PUSH_LEAD_MS, SALE_PUSH_LIVE, enqueueSalePushQuery, parseSaleKey, saleItemsQuery, salePushDue, saleKey, saleSendAt,
} from "./sale";

const at = (iso: string) => new Date(iso);
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(q);
const DAY_MS = 24 * 60 * 60_000;
// The Star Trek Superdrop: pre-queue 8 a.m. PT, sale 9 a.m. PT, Nov 9 2026 (PST, UTC-8).
const SUPERDROP = { preQueueAt: at("2026-11-09T16:00:00Z"), onSaleAt: at("2026-11-09T17:00:00Z") };

const saleItem = (over: Partial<Extract<PushItem, { sale: true }>> = {}): PushItem => ({
  kind: "secret-lair", sale: true, key: saleKey("c1"), batch: saleKey("c1"), title: "Secret Lair: Set Phasers to Superdrop",
  onSaleAt: SUPERDROP.onSaleAt, preQueueAt: SUPERDROP.preQueueAt, zone: "America/Los_Angeles", image: "https://images.example/x.jpg", href: "/out/wizards/c1", ...over,
});
const post = (key: string): PushItem => ({ kind: "secret-lair", key, batch: "b", title: "A post", excerpt: null, image: null, href: "/out/wizards/c9" });

describe("the sale push's switches", () => {
  it("ships on (the words passed /copy-review), and goes through the overnight hold (Hugh, 2026-11-10)", () => {
    expect(SALE_PUSH_LIVE).toBe(true);
    expect(SALE_PUSH_IGNORES_HOLD).toBe(true);
  });
});

describe("the sale push's key and instant", () => {
  it("round-trips a post's id and refuses another key", () => {
    expect(parseSaleKey(saleKey("abc"))).toBe("abc");
    expect(parseSaleKey("post:abc")).toBeNull();
    expect(parseSaleKey("sale:")).toBeNull();
  });

  it("is due the lead (15 minutes) before the pre-queue opens, or before the sale when the post has none", () => {
    expect(SALE_PUSH_LEAD_MS).toBe(15 * 60_000);
    expect(saleSendAt(SUPERDROP)).toEqual(at("2026-11-09T15:45:00Z"));
    expect(saleSendAt({ preQueueAt: null, onSaleAt: SUPERDROP.onSaleAt })).toEqual(at("2026-11-09T16:45:00Z"));
    expect(saleSendAt({ preQueueAt: null, onSaleAt: null })).toBeNull();
  });

  it("is due from the send instant until the sale begins, and not after the stale window", () => {
    expect(salePushDue(SUPERDROP, at("2026-11-09T15:44:00Z"), DAY_MS)).toBe(false);
    expect(salePushDue(SUPERDROP, at("2026-11-09T15:45:00Z"), DAY_MS)).toBe(true);
    expect(salePushDue(SUPERDROP, at("2026-11-09T16:59:00Z"), DAY_MS)).toBe(true);
    // A late tick: still due for one grace (a cron interval) past the sale, never after.
    expect(SALE_PUSH_GRACE_MS).toBe(15 * 60_000);
    expect(salePushDue(SUPERDROP, at("2026-11-09T17:00:00Z"), DAY_MS)).toBe(true);
    expect(salePushDue(SUPERDROP, at("2026-11-09T17:14:00Z"), DAY_MS)).toBe(true);
    expect(salePushDue(SUPERDROP, at("2026-11-09T17:15:00Z"), DAY_MS)).toBe(false);
    // With no pre-queue the lead is what lets the push land before the sale at all.
    const noQueue = { preQueueAt: null, onSaleAt: at("2026-11-09T17:00:00Z") };
    expect(salePushDue(noQueue, at("2026-11-09T16:44:00Z"), DAY_MS)).toBe(false);
    expect(salePushDue(noQueue, at("2026-11-09T16:45:00Z"), DAY_MS)).toBe(true);
    expect(salePushDue(SUPERDROP, at("2026-11-09T16:30:00Z"), 10 * 60_000)).toBe(false);
  });

  it("follows an edit made before it is sent: the new time is what the next run judges", () => {
    const moved = { preQueueAt: at("2026-11-09T19:00:00Z"), onSaleAt: at("2026-11-09T20:00:00Z") };
    const now = at("2026-11-09T16:30:00Z");
    expect(salePushDue(SUPERDROP, now, DAY_MS)).toBe(true);
    expect(salePushDue(moved, now, DAY_MS)).toBe(false);
    expect(salePushDue(moved, at("2026-11-09T18:45:00Z"), DAY_MS)).toBe(true);
  });
});

describe("the sale push's queries", () => {
  const now = at("2026-11-09T16:05:00Z");
  const q = render(enqueueSalePushQuery("u1", now, DAY_MS));

  it("queues one row per drop, keyed sale:<id>, at the send instant, and nothing on a repeat (so an edit after sending never sends again)", () => {
    const sql = flat(q.sql);
    expect(sql).toMatch(/^insert into "push_outbox" \(user_id, kind, item_key, batch_key, payload, created_at\) select \$1::text, 'secret-lair', \$2::text \|\| wa\.contentful_id, \$3::text \|\| wa\.contentful_id, '\{\}'::jsonb, /);
    expect(q.params.slice(0, 3)).toEqual(["u1", "sale:", "sale:"]);
    expect(sql).toMatch(/on conflict \(user_id, kind, item_key\) do nothing returning id$/);
  });

  it("reads only a Secret Lair post with a sale time, not a baseline one, and needs a device and the push tick", () => {
    const sql = flat(q.sql);
    expect(sql).toContain("wa.kind = 'secret-lair' and not wa.baseline and wa.on_sale_at is not null");
    expect(sql).toContain("coalesce(wa.pre_queue_at, wa.on_sale_at)");
    expect(sql).toContain('exists (select 1 from "push_subscriptions" sps where sps.user_id = $');
    expect(sql).toContain('left join "user_prefs" sup on sup.user_id = $');
  });

  it("reads a post's words only while its sale has not begun", () => {
    const r = render(saleItemsQuery(["c1"], now));
    expect(flat(r.sql)).toContain("wa.kind = 'secret-lair' and wa.on_sale_at + (900000 * interval '1 millisecond') > $2::timestamptz and wa.contentful_id = any($3::text[])");
    expect(flat(r.sql)).toContain("<= $1::timestamptz as due");
    expect(r.params).toEqual(["2026-11-09T16:05:00.000Z", "2026-11-09T16:05:00.000Z", ["c1"]]);
  });
});

describe("the sale push's words", () => {
  const NY = { zone: "America/New_York", now: at("2026-11-09T15:45:00Z") };
  it("leads with the hour in the device's zone, unlabelled, and names the sale and the store in the body", () => {
    expect(toMessage([saleItem()], NY)).toMatchObject({
      title: "Pre-queue opens at 11 a.m.", body: "Secret Lair: Set Phasers to Superdrop. On sale at 12 p.m. on the US store.", route: "/out/wizards/c1", tag: "secret-lair:sale:c1",
    });
  });
  it("leads with the sale when the post names no pre-queue", () => {
    expect(toMessage([saleItem({ preQueueAt: null })], NY)).toMatchObject({ title: "On sale at 12 p.m.", body: "Secret Lair: Set Phasers to Superdrop, on the US store." });
  });
  it("reads the store's zone, labelled, for a device that never said its zone", () => {
    const device = { zone: null, now: at("2026-11-09T15:45:00Z") };
    expect(toMessage([saleItem()], device)).toMatchObject({ title: "Pre-queue opens at 8 a.m. PT", body: "Secret Lair: Set Phasers to Superdrop. On sale at 9 a.m. PT on the US store." });
    expect(toMessage([saleItem()]).title).toBe("Pre-queue opens at 8 a.m. PT");
  });
  it("names the weekday of a time that falls on another day than the push", () => {
    const tokyo = { zone: "Asia/Tokyo", now: at("2026-11-09T15:45:00Z") };
    // 15:45Z is 00:45 Tue in Tokyo; the pre-queue (16:00Z) is 01:00 Tue the same day, the sale 02:00 Tue.
    expect(toMessage([saleItem()], tokyo).title).toBe("Pre-queue opens at 1 a.m.");
    const early = { zone: "Asia/Tokyo", now: at("2026-11-09T14:00:00Z") };
    expect(toMessage([saleItem()], early)).toMatchObject({ title: "Pre-queue opens Tue at 1 a.m.", body: expect.stringContaining("On sale Tue at 2 a.m.") });
  });
  it("says on sale now when a late tick lands after the sale began, with no hour named", () => {
    const late = { zone: "America/New_York", now: at("2026-11-09T17:05:00Z") };
    expect(toMessage([saleItem()], late)).toMatchObject({ title: "On sale now", body: "Secret Lair: Set Phasers to Superdrop, on the US store." });
    expect(toMessage([saleItem({ preQueueAt: null })], late).title).toBe("On sale now");
    // At the sale's own instant too, and with no device clock the pre-sale words stand.
    expect(toMessage([saleItem()], { zone: null, now: at("2026-11-09T17:00:00Z") }).title).toBe("On sale now");
    expect(toMessage([saleItem()]).title).toBe("Pre-queue opens at 8 a.m. PT");
  });
  it("is never merged with a post's announcement or another drop's push, live or on release", () => {
    const items = [saleItem(), saleItem({ key: saleKey("c2"), batch: saleKey("c2") }), post("post:c1")];
    expect(messagesFor(items, "live")).toHaveLength(3);
    expect(messagesFor(items, "release")).toHaveLength(3);
  });
});

describe("the overnight hold", () => {
  it("does not apply to the sale push by default, and never exempts another secret-lair item", () => {
    expect(exemptFromHold(saleItem())).toBe(true);
    expect(exemptFromHold(saleItem(), false)).toBe(false);
    expect(exemptFromHold(saleItem(), true)).toBe(true);
    expect(exemptFromHold(post("post:c1"), true)).toBe(false);
  });
});
