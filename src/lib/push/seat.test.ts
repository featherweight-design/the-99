import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { enqueueSeatPushQuery, seatItemKey, tableIdOfSeatKey } from "./seat";

const dialect = new PgDialect();
const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const NOW = new Date("2026-10-31T23:30:00.000Z");

describe("the seat notice's outbox row", () => {
  const q = dialect.sqlToQuery(enqueueSeatPushQuery("user_seated", TABLE, NOW));

  it("is one outbox row per (reader, kind, table); a repeat hits the conflict clause and does nothing", () => {
    expect(q.sql).toContain('insert into "push_outbox"');
    expect(q.sql).toContain("on conflict (user_id, kind, item_key) do nothing");
    expect(q.params).toContain("user_seated");
    expect(q.params).toContain("rule_zero_seat");
    expect(q.params).toContain(`table:${TABLE}`);
  });

  it("is queued only while the reader has a device, and judges no per-kind preference", () => {
    expect(q.sql).toContain('from "push_subscriptions" sps');
    expect(q.sql).toContain("sps.user_id =");
    expect(q.sql).not.toContain("push_kinds");
    expect(q.sql).not.toContain("feed_kinds");
  });

  it("holds no words", () => {
    expect(q.sql).toContain("'{}'::jsonb");
  });
});

describe("the seat notice's key", () => {
  it("names the table and reads back to it", () => {
    expect(seatItemKey(TABLE)).toBe(`table:${TABLE}`);
    expect(tableIdOfSeatKey(seatItemKey(TABLE))).toBe(TABLE);
  });

  it("is not any other key", () => {
    expect(tableIdOfSeatKey("item:123")).toBeNull();
    expect(tableIdOfSeatKey("table:")).toBeNull();
  });
});
