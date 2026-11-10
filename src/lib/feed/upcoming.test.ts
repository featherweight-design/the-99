import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import type { FeedView, HomeFeed } from "./home";
import { toUpcoming, upcomingQuery, withUpcoming, type UpcomingRow } from "./upcoming";

const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const NOW = new Date("2026-11-10T15:00:00Z");
const render = () => {
  const q = new PgDialect().sqlToQuery(upcomingQuery("user_1", NOW));
  return { sql: flat(q.sql), params: q.params };
};

describe("the upcoming drops read", () => {
  it("reads Secret Lair posts that are not the baseline, qualified over the alias", () => {
    const { sql } = render();
    expect(sql).toContain("from \"wizards_announcements\" wa");
    expect(sql).toContain("wa.kind = 'secret-lair' and wa.baseline = false");
    expect(sql).toContain("afd.key = 'post:' || wa.contentful_id");
  });
  it("keeps a timed drop until an hour after its sale, and a day-only drop through its day in the store's zone", () => {
    const { sql, params } = render();
    expect(sql).toContain("wa.on_sale_at + 3600000 * interval '1 millisecond' >");
    expect(sql).toContain("wa.on_sale_at is null and wa.on_sale_date is not null and wa.on_sale_date >= (");
    expect(params).toContain("America/Los_Angeles");
  });
  it("is the reader's own: their prefs, their dismissals, their kind stamp", () => {
    const { sql, params } = render();
    expect(sql).toContain("aup.user_id =");
    expect(sql).toContain("afd.user_id =");
    expect(params.filter((p) => p === "user_1").length).toBeGreaterThanOrEqual(2);
    expect(sql).toMatch(/wa\.first_seen_at > /);
  });
  it("orders soonest first, a day-only drop at the store's midnight", () => {
    expect(render().sql).toMatch(/order by coalesce\(wa\.on_sale_at, wa\.on_sale_date::timestamp at time zone \$\d+\), wa\.contentful_id limit 8/);
  });
});

const ROW: UpcomingRow = {
  id: "c1", title: "Secret Lair x Avatar", excerpt: "Four decks.", hero: "https://img.example/a.jpg", url: "https://magic.wizards.com/en/news/x",
  first_seen_at: "2026-11-09T12:00:00Z", unseen: true, on_sale_date: "2026-11-16", on_sale_at: new Date("2026-11-16T17:00:00Z"),
  on_sale_zone: "America/Los_Angeles", pre_queue_at: "2026-11-16T16:00:00Z",
};

describe("a row as the page draws it", () => {
  it("is the feed's own Secret Lair row, with its sale and its press through the app's out route", () => {
    expect(toUpcoming(ROW)).toMatchObject({
      key: "post:c1", kind: "secret-lair", unseen: true, outbound: "/out/wizards/c1", at: "2026-11-09T12:00:00.000Z",
      post: {
        title: "Secret Lair x Avatar", summary: "Four decks.", hero: "https://img.example/a.jpg",
        sale: { date: "2026-11-16", at: "2026-11-16T17:00:00.000Z", preQueueAt: "2026-11-16T16:00:00.000Z", zone: "America/Los_Angeles" },
      },
    });
  });
  it("draws no press for an address that is not on magic.wizards.com", () => {
    expect(toUpcoming({ ...ROW, url: "https://evil.example/x" }).outbound).toBeNull();
  });
  it("keeps a day-only drop's nulls", () => {
    expect(toUpcoming({ ...ROW, on_sale_at: null, pre_queue_at: null, on_sale_zone: null }).post?.sale).toEqual({ date: "2026-11-16", at: null, preQueueAt: null, zone: null });
  });
});

const view = (key: string, unseen = false): FeedView => toUpcoming({ ...ROW, id: key.slice(5), unseen });
const feed = (over: Partial<Extract<HomeFeed, { chosen: true }>> = {}): HomeFeed => ({ chosen: true, on: ["secret-lair"], items: [], unseen: 0, lead: null, ...over });

describe("the group on the feed", () => {
  it("moves a drop the window holds out of the rows, and counts a drop it did not hold", () => {
    const held = view("post:a", true);
    const out = view("post:b", true);
    const other = { ...view("post:z"), key: "post:z", kind: "wizards-news" as const };
    const got = withUpcoming(feed({ items: [held, other], unseen: 1 }), [held, out]);
    expect(got).toMatchObject({ items: [other], upcoming: [held, out], unseen: 2 });
  });
  it("does not repeat the lead in the group", () => {
    const lead = view("post:a");
    const got = withUpcoming(feed({ lead }), [lead, view("post:b")]);
    expect(got).toMatchObject({ lead, upcoming: [expect.objectContaining({ key: "post:b" })] });
  });
  it("adds nothing with Secret Lair's In app tick off, or no drops", () => {
    const f = feed({ on: ["new-set"] });
    expect(withUpcoming(f, [view("post:a")])).toBe(f);
    const g = feed();
    expect(withUpcoming(g, [])).toBe(g);
  });
});
