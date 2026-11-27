import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// What noticeTradeMatches does with what it reads: which writes get a push condition, what it clears, and in what
// order it takes the lock and judges the day. The SQL itself is pinned in trade-match.test.ts and run by the probe.
const h = vi.hoisted(() => ({
  rows: [] as { oracle_id: string; quiet_since: string | null; quiet: boolean; enabled_at: string }[],
  spares: [] as { oracleId: string; friend: { publicId: string } }[],
  grantors: [] as { publicId: string; userId: string }[],
  calls: [] as string[],
  records: [] as { oracleId: string; pushWhen: string }[],
}));

const render = (q: SQL) => new PgDialect().sqlToQuery(q);
const label = (q: SQL) => {
  const s = render(q).sql;
  if (s.startsWith("select pg_advisory_xact_lock")) return "lock";
  if (s.includes(`from "push_subscriptions" tps`)) return "zone";
  if (s.startsWith(`update "wishlist_synced"`)) return "clear";
  return "read";
};

vi.mock("../../db", () => {
  const tx = {
    execute: vi.fn(async (q: SQL) => {
      h.calls.push(`tx:${label(q)}`);
      return { rows: [] };
    }),
  };
  return {
    db: {
      execute: vi.fn(async (q: SQL) => {
        const l = label(q);
        h.calls.push(`db:${l}`);
        return { rows: l === "read" ? h.rows : [] };
      }),
      transaction: vi.fn(async (fn: (t: typeof tx) => Promise<number>) => fn(tx)),
    },
  };
});
vi.mock("../feed/flag", () => ({ availableFeedKinds: () => ["trade-match"] }));
vi.mock("./spares", () => ({
  friendGeneration: async () => `g${Math.random()}`,
  loadFriendSpares: async () => h.spares,
  spareGrantorsQuery: async () => h.grantors,
}));
vi.mock("./feed-write", () => ({
  recordFeedItem: vi.fn(async (_tx: unknown, i: { oracleId: string; pushWhen: SQL }) => {
    h.calls.push("record");
    h.records.push({ oracleId: i.oracleId, pushWhen: render(i.pushWhen).sql });
    return true;
  }),
}));

import { noticeTradeMatches } from "./trade-match";

const row = (oracle_id: string, quiet_since: string | null, quiet: boolean) => ({ oracle_id, quiet_since, quiet, enabled_at: "2026-11-01" });
const ENV = {} as NodeJS.ProcessEnv;
const spare = (oracleId: string, publicId = "p1") => ({ oracleId, friend: { publicId } });

beforeEach(() => {
  h.calls = [];
  h.records = [];
  h.grantors = [{ publicId: "p1", userId: "friend_1" }];
});

describe("noticeTradeMatches", () => {
  it("writes a quiet card with no push, and caps a loud one at the day's one push", async () => {
    h.rows = [row("q", "2026-11-27 10:00:00+00", true), row("l", null, false)];
    h.spares = [spare("q"), spare("l")];
    expect(await noticeTradeMatches("viewer_1", ENV)).toBe(2);
    expect(h.records.find((r) => r.oracleId === "q")?.pushWhen).toBe("false");
    expect(h.records.find((r) => r.oracleId === "l")?.pushWhen).toMatch(/^not exists \(select 1 from "push_outbox" tpo/);
  });

  it("takes the lock before it judges the day, and clears quiet in the same transaction after the writes", async () => {
    h.rows = [row("q", "2026-11-27 10:00:00+00", true)];
    h.spares = [spare("q")];
    await noticeTradeMatches("viewer_1", ENV);
    expect(h.calls.filter((c) => c.startsWith("tx:") || c === "record")).toEqual(["tx:lock", "tx:zone", "record", "tx:clear"]);
  });

  it("leaves a skipped card's line quiet, and clears a hand-wanted card's quiet synced row", async () => {
    h.rows = [row("gone", "2026-11-27 10:00:00+00", true), row("hand", "2026-11-27 10:00:01+00", false)];
    h.spares = [spare("gone", "p_gone"), spare("hand")];
    const { db } = await import("../../db");
    const tx = vi.mocked(db.transaction);
    let cleared: unknown[] = [];
    tx.mockImplementationOnce(async (fn) =>
      fn({
        execute: async (q: SQL) => {
          if (label(q) === "clear") cleared = render(q).params;
          return { rows: [] };
        },
      } as never),
    );
    await noticeTradeMatches("viewer_1", ENV);
    expect(h.records.map((r) => r.oracleId)).toEqual(["hand"]);
    expect(cleared).toEqual(["viewer_1", "{hand}", `{"2026-11-27 10:00:01+00"}`]);
  });

  it("with no spares, still clears the quiet rows it read, and with no quiet rows clears nothing", async () => {
    h.spares = [];
    h.rows = [row("q", "2026-11-27 10:00:00+00", true)];
    await noticeTradeMatches("viewer_1", ENV);
    expect(h.calls).toContain("db:clear");
    h.calls = [];
    h.rows = [row("l", null, false)];
    await noticeTradeMatches("viewer_1", ENV);
    expect(h.calls).not.toContain("db:clear");
  });
});
