// What `setTable` and `reseatTable` do with the seat notice (Rule 0 revisions, item 6), against a fake transaction that answers each
// read in the order the code makes it: only a NEW player is queued, a staying seat keeps its `noticeSeenAt`, the setter's own seat is
// born seen, a removed seat pushes nothing, and the kick comes after the commit.
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ state: { committed: false }, kicked: [] as { user: string; afterCommit: boolean }[], tx: null as unknown }));
vi.mock("../../db", async (orig) => ({
  ...(await orig<typeof import("../../db")>()),
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const out = await fn(m.tx);
      m.state.committed = true;
      return out;
    },
  },
}));
vi.mock("../push/kick", () => ({ kickPush: (user: string) => m.kicked.push({ user, afterCommit: m.state.committed }) }));

import { ruleZeroSeats, ruleZeroSeen, ruleZeroTables } from "../../db/schema";
import { reseatTable, setTable } from "./rule-zero";

const dialect = new PgDialect();
const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const POD = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const P_SETTER = "11111111-1111-4111-8111-111111111111";
const P_STAY = "22222222-2222-4222-8222-222222222222";
const P_NEW = "33333333-3333-4333-8333-333333333333";
const SEEN_SETTER = new Date("2026-10-31T20:00:00.000Z");
const SEEN_STAY = new Date("2026-10-31T21:00:00.000Z");
const CHANGED = new Date("2026-10-31T19:00:00.000Z");

type Write = { table: unknown; values?: Record<string, unknown>[] };

/** `selects` are answered in call order; an `execute` answers by what it is; every insert, delete and outbox write is recorded. */
function fakeTx(selects: unknown[][]) {
  const queue = [...selects];
  const selectCalls: { fields: Record<string, unknown>; lock: string | null }[] = [];
  const inserts: Write[] = [];
  const deletes: Write[] = [];
  const outbox: unknown[] = [];
  const thenable = (result: unknown, onValues?: (v: Record<string, unknown>[]) => void, onFor?: (mode: string) => void) => {
    const c: Record<string, unknown> = { then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej) };
    for (const name of ["from", "innerJoin", "leftJoin", "where", "orderBy", "limit", "returning"]) c[name] = () => c;
    c.for = (mode: string) => { onFor?.(mode); return c; };
    c.values = (v: Record<string, unknown>[]) => { onValues?.(v); return c; };
    return c;
  };
  const tx = {
    select: (fields: Record<string, unknown>) => {
      const call = { fields, lock: null as string | null };
      selectCalls.push(call);
      return thenable(queue.shift() ?? [], undefined, (mode) => { call.lock = mode; });
    },
    delete: (table: unknown) => { deletes.push({ table }); return thenable([]); },
    insert: (table: unknown) => {
      const w: Write = { table };
      inserts.push(w);
      return thenable(table === ruleZeroTables ? [{ id: TABLE }] : [], (v) => { w.values = v; });
    },
    execute: async (s: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      const q = dialect.sqlToQuery(s);
      if (q.sql.includes("extract(epoch")) return { rows: [{ ms: "1000" }] };
      if (q.sql.includes('into "push_outbox"') || q.sql.includes("push_outbox")) { outbox.push(q.params[0]); return { rows: [{ id: "row" }] }; }
      return { rows: [] };
    },
  };
  m.tx = tx;
  return { selectCalls, inserts, deletes, outbox };
}

const asks = (...members: string[]) => members.map((member) => ({ member, deck: null }));
const profile = (userId: string, publicId: string) => ({ userId, publicId });

beforeEach(() => {
  m.state.committed = false;
  m.kicked.length = 0;
});

describe("reseatTable and the seat notice", () => {
  // setter, stay and gone sit now; the new asks keep setter and stay, add newbie, drop gone.
  const reseatSelects = (publicIds: [string, string][]) => [
    [{ podId: POD }], [{ id: POD }], [{ id: TABLE }], [{ userId: "setter" }],
    [
      { userId: "setter", deckId: null, changedAt: CHANGED, noticeSeenAt: SEEN_SETTER },
      { userId: "stay", deckId: null, changedAt: CHANGED, noticeSeenAt: SEEN_STAY },
      { userId: "gone", deckId: null, changedAt: CHANGED, noticeSeenAt: null },
    ],
    publicIds.map(([u, p]) => profile(u, p)),
    publicIds.map(([u, p]) => profile(u, p)),
    publicIds.filter(([u]) => u !== "setter").map(([u]) => ({ userId: u })),
  ];

  it("reads the seats FOR UPDATE, queues a push only for a new player, keeps a staying seat's notice, and kicks after the commit", async () => {
    const f = fakeTx(reseatSelects([["setter", P_SETTER], ["stay", P_STAY], ["newbie", P_NEW]]));
    expect(await reseatTable("setter", TABLE, asks(P_SETTER, P_STAY, P_NEW))).toEqual({ kind: "reseated" });
    const before = f.selectCalls.find((c) => "noticeSeenAt" in c.fields);
    expect(before?.lock).toBe("update");
    expect(f.outbox).toEqual(["newbie"]);
    const seatInsert = f.inserts.find((w) => w.table === ruleZeroSeats)!;
    const byUser = new Map(seatInsert.values!.map((v) => [v.userId, v]));
    expect(byUser.get("setter")!.noticeSeenAt).toBe(SEEN_SETTER);
    expect(byUser.get("stay")!.noticeSeenAt).toBe(SEEN_STAY);
    expect(byUser.get("stay")!.changedAt).toBe(CHANGED);
    expect(byUser.get("newbie")!.noticeSeenAt).toBeNull();
    expect(m.kicked).toEqual([{ user: "newbie", afterCommit: true }]);
  });

  it("pushes nothing when a seat is only removed, and clears the removed player's seen row", async () => {
    const f = fakeTx(reseatSelects([["setter", P_SETTER], ["stay", P_STAY]]));
    expect(await reseatTable("setter", TABLE, asks(P_SETTER, P_STAY))).toEqual({ kind: "reseated" });
    expect(f.outbox).toEqual([]);
    expect(m.kicked).toEqual([]);
    expect(f.deletes.map((d) => d.table)).toEqual([ruleZeroSeats, ruleZeroSeen]);
  });
});

describe("setTable and the seat notice", () => {
  it("writes the setter's own seat seen and the others' unseen, queues only the others, and kicks after the commit", async () => {
    const f = fakeTx([
      [{ id: POD }], [{ userId: "setter" }], [],
      [profile("setter", P_SETTER), profile("friend", P_STAY)],
      [{ userId: "friend" }],
    ]);
    const out = await setTable("setter", POD, asks(P_SETTER, P_STAY), "America/New_York");
    expect(out).toEqual({ kind: "set", tableId: TABLE });
    const seatInsert = f.inserts.find((w) => w.table === ruleZeroSeats)!;
    const byUser = new Map(seatInsert.values!.map((v) => [v.userId, v]));
    expect(byUser.get("setter")!.noticeSeenAt).toBeInstanceOf(Date);
    expect(byUser.get("friend")!.noticeSeenAt).toBeNull();
    expect(f.outbox).toEqual(["friend"]);
    expect(m.kicked).toEqual([{ user: "friend", afterCommit: true }]);
  });
});
