// A seated player other than the setter gets one seat push; the setter never does (Rule 0 revisions, item 6).
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("../push/kick", () => ({ kickPush: vi.fn() }));

import { queueSeatPushes } from "./rule-zero";

const dialect = new PgDialect();
const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const NOW = new Date("2026-10-31T23:30:00.000Z");

/** A transaction whose outbox answers a row for each reader in `queued`, as the insert's `returning id` would. */
const fakeTx = (queued: readonly string[]) => {
  const writes: { sql: string; params: unknown[] }[] = [];
  const tx = {
    execute: async (s: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      const q = dialect.sqlToQuery(s);
      writes.push({ sql: q.sql, params: q.params });
      return { rows: queued.includes(q.params[0] as string) ? [{ id: "row" }] : [] };
    },
  };
  return { tx: tx as never, writes };
};

describe("queueSeatPushes", () => {
  it("queues one push per seated player but the setter, and answers who was queued", async () => {
    const { tx, writes } = fakeTx(["b", "c"]);
    const queued = await queueSeatPushes(tx, TABLE, "setter", ["setter", "b", "c"], NOW);
    expect(queued).toEqual(["b", "c"]);
    expect(writes.map((w) => w.params[0])).toEqual(["b", "c"]);
    expect(writes.every((w) => w.sql.includes("on conflict (user_id, kind, item_key) do nothing"))).toBe(true);
  });

  it("does not report a player whose row already existed or who has no device (the insert answered nothing)", async () => {
    const { tx } = fakeTx([]);
    expect(await queueSeatPushes(tx, TABLE, "setter", ["setter", "b"], NOW)).toEqual([]);
  });

  it("queues nothing for a table of the setter alone", async () => {
    const { tx, writes } = fakeTx(["setter"]);
    expect(await queueSeatPushes(tx, TABLE, "setter", ["setter"], NOW)).toEqual([]);
    expect(writes).toEqual([]);
  });
});
