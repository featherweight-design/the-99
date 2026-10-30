import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { BATCH_WINDOW_MS, defaultBatchKey, enqueuePushQuery } from "./enqueue";
import { pushKindEnabledAt } from "./kind-gate";
import { sql } from "drizzle-orm";

const dialect = new PgDialect();
const NOW = new Date("2026-10-22T12:00:00.000Z");
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(q);

describe("the outbox insert", () => {
  const q = render(enqueuePushQuery({ userId: "u1", kind: "price-drop", itemKey: "k1", now: NOW }));

  it("writes one outbox row, nothing on a repeat", () => {
    expect(q.sql).toContain('insert into "push_outbox"');
    expect(q.sql).toContain("on conflict (user_id, kind, item_key) do nothing");
  });

  it("only while the reader has a device and the kind's PUSH is on, never the feed's", () => {
    expect(q.sql).toContain('from "push_subscriptions" pps');
    expect(q.sql).toContain("pps.user_id =");
    expect(q.sql).toContain("pup.push_kinds ->>");
    expect(q.sql).toContain("pup.push_kinds_declined");
    expect(q.sql).not.toContain("feed_kinds");
  });

  it("only for an item newer than the kind's push stamp", () => {
    expect(q.sql).toMatch(/::timestamptz > coalesce\(/);
  });

  it("holds no words: the payload is empty", () => {
    expect(q.sql).toContain("'{}'::jsonb");
  });

  it("batches by the kind's 15-minute window unless the writer names its run", () => {
    expect(defaultBatchKey("combo", NOW)).toBe(`combo:${Math.floor(NOW.getTime() / BATCH_WINDOW_MS)}`);
    expect(defaultBatchKey("combo", new Date(NOW.getTime() + BATCH_WINDOW_MS))).not.toBe(defaultBatchKey("combo", NOW));
    expect(q.params).toContain(defaultBatchKey("price-drop", NOW));
    expect(render(enqueuePushQuery({ userId: "u1", kind: "combo", itemKey: "k", batchKey: "run-7", now: NOW })).params).toContain("run-7");
  });

  it("takes the item's key as SQL, and an extra condition, so it can ride on the feed insert's own row", () => {
    const r = render(enqueuePushQuery({ userId: "u1", kind: "combo", itemKey: sql`'item:' || (select w.id::text from wrote w)`, when: sql`exists (select 1 from wrote)`, now: NOW }));
    expect(r.sql).toContain("'item:' || (select w.id::text from wrote w)");
    expect(r.sql.replace(/\s+/g, " ")).toContain("where exists (select 1 from wrote) and exists (select 1 from \"push_subscriptions\" pps");
  });
});

describe("the push stamp", () => {
  it("is feed_kinds' rule over the push columns, with the same default-on kind", () => {
    const g = render(pushKindEnabledAt(sql`pup`, sql`${"spare-request"}::text`));
    expect(g.sql).toContain("pup.push_kinds");
    expect(g.sql).toContain("pup.push_kinds_declined");
    expect(g.sql).toContain("'-infinity'::timestamptz");
    expect(g.params).toContainEqual(["spare-request", "secret-lair", "commander-decklists", "wizards-news"]);
  });
});
