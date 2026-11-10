import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { messagesFor, toMessage, type PushItem } from "./message";
import { exemptFromHold } from "./plan";
import {
  SALE_PUSH_IGNORES_HOLD, SALE_PUSH_LIVE, enqueueSalePushQuery, parseSaleKey, saleClock, saleItemsQuery, salePushDue, saleKey, saleSendAt,
} from "./sale";

const at = (iso: string) => new Date(iso);
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(q);
const DAY_MS = 24 * 60 * 60_000;
// The Star Trek Superdrop: pre-queue 8 a.m. PT, sale 9 a.m. PT, Nov 9 2026 (PST, UTC-8).
const SUPERDROP = { preQueueAt: at("2026-11-09T16:00:00Z"), onSaleAt: at("2026-11-09T17:00:00Z") };

const saleItem = (over: Partial<Extract<PushItem, { sale: true }>> = {}): PushItem => ({
  kind: "secret-lair", sale: true, key: saleKey("c1"), batch: saleKey("c1"), title: "Secret Lair: Set Phasers to Superdrop",
  when: "Mon 9 a.m. PT", queue: "8 a.m. PT", image: "https://images.example/x.jpg", href: "/out/wizards/c1", ...over,
});
const post = (key: string): PushItem => ({ kind: "secret-lair", key, batch: "b", title: "A post", excerpt: null, image: null, href: "/out/wizards/c9" });

describe("the sale push's switches", () => {
  it("ships off and keeps the overnight hold, until Design and Hugh rule", () => {
    expect(SALE_PUSH_LIVE).toBe(false);
    expect(SALE_PUSH_IGNORES_HOLD).toBe(false);
  });
});

describe("the sale push's key and instant", () => {
  it("round-trips a post's id and refuses another key", () => {
    expect(parseSaleKey(saleKey("abc"))).toBe("abc");
    expect(parseSaleKey("post:abc")).toBeNull();
    expect(parseSaleKey("sale:")).toBeNull();
  });

  it("is due when the pre-queue opens, or at the sale when the post has none", () => {
    expect(saleSendAt(SUPERDROP)).toEqual(SUPERDROP.preQueueAt);
    expect(saleSendAt({ preQueueAt: null, onSaleAt: SUPERDROP.onSaleAt })).toEqual(SUPERDROP.onSaleAt);
    expect(saleSendAt({ preQueueAt: null, onSaleAt: null })).toBeNull();
  });

  it("is due from the send instant until the sale begins, and not after the stale window", () => {
    expect(salePushDue(SUPERDROP, at("2026-11-09T15:59:00Z"), DAY_MS)).toBe(false);
    expect(salePushDue(SUPERDROP, at("2026-11-09T16:00:00Z"), DAY_MS)).toBe(true);
    expect(salePushDue(SUPERDROP, at("2026-11-09T16:59:00Z"), DAY_MS)).toBe(true);
    expect(salePushDue(SUPERDROP, at("2026-11-09T17:00:00Z"), DAY_MS)).toBe(false);
    expect(salePushDue({ preQueueAt: null, onSaleAt: at("2026-11-09T17:00:00Z") }, at("2026-11-09T16:30:00Z"), DAY_MS)).toBe(false);
    expect(salePushDue(SUPERDROP, at("2026-11-09T16:30:00Z"), 10 * 60_000)).toBe(false);
  });

  it("follows an edit made before it is sent: the new time is what the next run judges", () => {
    const moved = { preQueueAt: at("2026-11-09T19:00:00Z"), onSaleAt: at("2026-11-09T20:00:00Z") };
    const now = at("2026-11-09T16:30:00Z");
    expect(salePushDue(SUPERDROP, now, DAY_MS)).toBe(true);
    expect(salePushDue(moved, now, DAY_MS)).toBe(false);
    expect(salePushDue(moved, at("2026-11-09T19:00:00Z"), DAY_MS)).toBe(true);
  });
});

describe("the sale push's queries", () => {
  const now = at("2026-11-09T16:05:00Z");
  const q = render(enqueueSalePushQuery("u1", now, DAY_MS));

  it("queues one row per drop, keyed sale:<id>, at the send instant, and nothing on a repeat (so an edit after sending never sends again)", () => {
    const sql = flat(q.sql);
    expect(sql).toMatch(/^insert into "push_outbox" \(user_id, kind, item_key, batch_key, payload, created_at\) select \$1, 'secret-lair', \$2 \|\| wa\.contentful_id, \$3 \|\| wa\.contentful_id, '\{\}'::jsonb, /);
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
    expect(flat(r.sql)).toContain("wa.kind = 'secret-lair' and wa.on_sale_at > $2::timestamptz and wa.contentful_id = any($3::text[])");
    expect(flat(r.sql)).toContain("<= $1::timestamptz as due");
    expect(r.params).toEqual(["2026-11-09T16:05:00.000Z", "2026-11-09T16:05:00.000Z", ["c1"]]);
  });
});

describe("the sale push's words", () => {
  it("formats the clock in the zone the post wrote it in, as the post wrote it", () => {
    expect(saleClock(SUPERDROP.onSaleAt, "America/Los_Angeles", true)).toBe("Mon 9 a.m. PT");
    expect(saleClock(SUPERDROP.preQueueAt, "America/Los_Angeles", false)).toBe("8 a.m. PT");
    expect(saleClock(at("2026-12-03T18:30:00Z"), "America/New_York", true)).toBe("Thu 1:30 p.m. ET");
  });

  it("says the pre-queue and the sale, or the sale alone, and lands on the post", () => {
    const m = toMessage([saleItem()]);
    expect(m).toMatchObject({ title: "Secret Lair: Set Phasers to Superdrop", body: "Pre-queue opens 8 a.m. PT. On sale Mon 9 a.m. PT.", route: "/out/wizards/c1", tag: "secret-lair:sale:c1" });
    expect(toMessage([saleItem({ queue: null })]).body).toBe("On sale Mon 9 a.m. PT.");
  });

  it("is never merged with a post's announcement or another drop's push, live or on release", () => {
    const items = [saleItem(), saleItem({ key: saleKey("c2"), batch: saleKey("c2") }), post("post:c1")];
    expect(messagesFor(items, "live")).toHaveLength(3);
    expect(messagesFor(items, "release")).toHaveLength(3);
  });
});

describe("the overnight hold", () => {
  it("applies to the sale push unless Design's ruling flips it, and never to another secret-lair item", () => {
    expect(exemptFromHold(saleItem(), false)).toBe(false);
    expect(exemptFromHold(saleItem(), true)).toBe(true);
    expect(exemptFromHold(post("post:c1"), true)).toBe(false);
  });
});
