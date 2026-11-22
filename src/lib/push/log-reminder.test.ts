import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { enqueueLogPushQuery, logItemKey, parseLogKey } from "./log-reminder";

const dialect = new PgDialect();
const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const MS = 1795331737000;
const NOW = new Date("2026-11-22T23:30:00.000Z");

describe("the log reminder's outbox row", () => {
  const q = dialect.sqlToQuery(enqueueLogPushQuery("user_player", TABLE, MS, NOW));

  it("is one row per (reader, game); a repeat hits the conflict clause", () => {
    expect(q.sql).toContain('insert into "push_outbox"');
    expect(q.sql).toContain("on conflict (user_id, kind, item_key) do nothing");
    expect(q.params).toContain("user_player");
    expect(q.params).toContain("rule_zero_log");
    expect(q.params).toContain(`game:${TABLE}:${MS}`);
  });

  it("batches by table", () => {
    expect(q.params.filter((p) => p === TABLE)).toHaveLength(1);
  });

  it("is queued only while the reader has a device, judging no per-kind preference, and holds no words", () => {
    expect(q.sql).toContain('from "push_subscriptions" lps');
    expect(q.sql).toContain("lps.user_id =");
    expect(q.sql).not.toContain("push_kinds");
    expect(q.sql).toContain("'{}'::jsonb");
  });
});

describe("the log reminder's key", () => {
  it("names the table and the game and reads back", () => {
    expect(logItemKey(TABLE, MS)).toBe(`game:${TABLE}:${MS}`);
    expect(parseLogKey(logItemKey(TABLE, MS))).toEqual({ tableId: TABLE, gameMs: MS });
  });

  it("is not any other key", () => {
    expect(parseLogKey(`table:${TABLE}`)).toBeNull();
    expect(parseLogKey(`game:${TABLE}`)).toBeNull();
    expect(parseLogKey(`game:not-a-uuid:${MS}`)).toBeNull();
    expect(parseLogKey(`game:${TABLE}:${MS}:x`)).toBeNull();
    expect(parseLogKey(`game:${TABLE}:abc`)).toBeNull();
  });
});
