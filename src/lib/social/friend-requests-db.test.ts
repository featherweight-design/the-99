import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** The request writes against a scripted database: each select answers the next queued rows, every call is logged. */
const state = vi.hoisted(() => ({
  selects: [] as unknown[][],
  executes: [] as { rows: unknown[] }[],
  updates: [] as unknown[][],
  log: [] as { op: string; arg?: unknown }[],
  enforce: [] as string[],
  keyLive: true,
}));

vi.mock("../../db", async () => {
  // A statement is logged as its rendered SQL and parameters: a table interpolated into it does not stringify.
  const { PgDialect: Dialect } = await import("drizzle-orm/pg-core");
  const dialect = new Dialect();
  const chain = (result: () => unknown, op: string): unknown => {
    const p: object = new Proxy(function () {}, {
      get(_t, key) {
        if (key === "then") return (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve().then(result).then(ok, bad);
        return (arg?: unknown) => {
          if (key === "set" || key === "values" || key === "where") state.log.push({ op: `${op}.${String(key)}`, arg });
          return p;
        };
      },
    });
    return p;
  };
  const q = {
    select: () => { state.log.push({ op: "select" }); return chain(() => state.selects.shift() ?? [], "select"); },
    insert: () => { state.log.push({ op: "insert" }); return chain(() => [], "insert"); },
    update: () => { state.log.push({ op: "update" }); return chain(() => state.updates.shift() ?? [], "update"); },
    execute: (s: SQL) => {
      state.log.push({ op: "execute", arg: JSON.stringify(dialect.sqlToQuery(s)) });
      return Promise.resolve(state.executes.shift() ?? { rows: [] });
    },
    transaction: async (fn: (tx: unknown) => unknown) => fn(q),
  };
  return { db: q };
});
vi.mock("../rate/observe", () => ({ enforceHit: async (_u: string, bucket: string) => { state.enforce.push(bucket); state.log.push({ op: `enforce:${bucket}` }); return null; } }));
vi.mock("./friend-link-keys", () => ({
  liveLinkKeyIn: async (_q: unknown, token: unknown) => (token === "live" ? { id: "key-1", userId: "owner" } : null),
  liveCodeKeyIn: async (_q: unknown, code: unknown) => { state.log.push({ op: "lookup" }); return code === "K7Q4XM" ? { id: "key-1", userId: "owner" } : null; },
  holdLiveKeyIn: async () => state.keyLive,
}));

import { db } from "../../db";
import { befriendIn } from "./friends";
import { isThirdPartyName } from "../person-name";
import { markFriendRequestsSeenQuery, sendFriendRequest, waitingOn } from "./friend-requests";

const ON = { FRIEND_LINKS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const SECRET = "e".repeat(64);
const NOW = new Date("2026-11-12T12:00:00Z");
const ops = () => state.log.map((l) => l.op);

beforeEach(() => {
  state.selects = [];
  state.executes = [];
  state.updates = [];
  state.log = [];
  state.enforce = [];
  state.keyLive = true;
});

describe("sendFriendRequest", () => {
  it("writes a first request under the pair lock and counts it against the day's requests", async () => {
    state.selects = [[{ publicId: "p-owner", displayName: "Owner" }], [{ publicId: "p-me" }], []];
    const out = await sendFriendRequest("me", { via: "link", token: "live" }, ON, SECRET, NOW);
    expect(out).toMatchObject({ ok: true, outcome: "sent", owner: { publicId: "p-owner" } });
    // The owner's face: the name minted as a ThirdPartyName, never the raw string, and the card join read.
    const owner = (out as { owner: { displayName: unknown; commander: unknown } }).owner;
    expect(isThirdPartyName(owner.displayName)).toBe(true);
    expect(owner).toHaveProperty("commander");
    expect(state.log[0].arg).toContain("friend-request:me:owner");
    expect(ops()).toContain("insert");
    expect(state.enforce).toEqual(["friend-request-day"]);
  });

  it("opening a link already asked sends nothing and counts nothing", async () => {
    state.selects = [[{ publicId: "p-owner", displayName: "Owner" }], [{ publicId: "p-me" }], [{ requesterUserId: "me", state: "waiting", noticedAt: NOW }]];
    expect((await sendFriendRequest("me", { via: "link", token: "live" }, ON, SECRET, NOW)).ok).toBe(true);
    expect(ops()).not.toContain("insert");
    expect(ops()).not.toContain("update");
    expect(state.enforce).toEqual([]);
  });

  it("counts every code try against both code caps, before the lookup, a wrong one too", async () => {
    expect(await sendFriendRequest("me", { via: "code", code: "WRONG2" }, ON, SECRET, NOW)).toEqual({ ok: false, reason: "notFound" });
    expect(state.enforce.sort()).toEqual(["friend-code", "friend-code-day"]);
    const order = ops();
    expect(order.indexOf("lookup")).toBeGreaterThan(order.indexOf("enforce:friend-code"));
    expect(order.indexOf("lookup")).toBeGreaterThan(order.indexOf("enforce:friend-code-day"));
  });

  it("reads a link reset while the send waited as no link, and reads or writes nothing of its owner", async () => {
    state.keyLive = false;
    expect(await sendFriendRequest("me", { via: "link", token: "live" }, ON, SECRET, NOW)).toEqual({ ok: false, reason: "notFound" });
    expect(ops()).not.toContain("select");
    expect(ops()).not.toContain("insert");
  });

  it("asks nobody for a requester with no profile", async () => {
    state.selects = [[{ publicId: "p-owner", displayName: "Owner" }], []];
    expect(await sendFriendRequest("me", { via: "link", token: "live" }, ON, SECRET, NOW)).toEqual({ ok: false, reason: "noProfile" });
    expect(ops()).not.toContain("insert");
  });

  it("does nothing with the switch off", async () => {
    expect(await sendFriendRequest("me", { via: "link", token: "live" }, {} as unknown as NodeJS.ProcessEnv, SECRET, NOW)).toEqual({ ok: false, reason: "notFound" });
    expect(ops()).toEqual([]);
  });
});

describe("befriendIn", () => {
  it("takes the pair lock, writes the friendship, and settles requests either way as accepted", async () => {
    await befriendIn(db as never, "b", "a", NOW);
    expect(ops()).toEqual(["execute", "insert", "insert.values", "update", "update.set", "update.where"]);
    expect(state.log[0].arg).toContain("friend-request:a:b");
    expect(state.log[4].arg).toEqual({ state: "accepted", answeredAt: NOW });
    const where = new PgDialect().sqlToQuery(state.log[5].arg as SQL);
    expect(where.sql).toMatch(/in \(\(\$\d+, \$\d+\), \(\$\d+, \$\d+\)\)/);
    expect(where.params).toEqual(["b", "a", "a", "b"]);
    // A decline is permanent for the pair (H2): a befriend never turns it into an accept.
    expect(where.sql).toContain(`<> 'declined'`);
  });
});

describe("markFriendRequestsSeenQuery", () => {
  it("moves the Friends cursor only for a request the section draws, and never backwards", () => {
    const q = new PgDialect().sqlToQuery(markFriendRequestsSeenQuery("o", NOW)).sql;
    expect(q).toContain(`join "social_profiles" on "social_profiles".user_id = "friend_requests".requester_user_id`);
    expect(q).toContain(`"friend_requests"."state" = $`);
    expect(q).toContain(`ffl.friend_user_id = "friend_requests".requester_user_id`);
    expect(q).toContain(`"friend_requests".noticed_at > coalesce(`);
    expect(q).toContain(`where up.friends_seen_at is null or up.friends_seen_at < excluded.friends_seen_at`);
  });
});

describe("waitingOn", () => {
  it("qualifies both sides of the already-friends test", () => {
    const sql = new PgDialect().sqlToQuery(waitingOn("o")).sql;
    expect(sql).toContain(`ffl.user_id = "friend_requests".owner_user_id`);
    expect(sql).toContain(`ffl.friend_user_id = "friend_requests".requester_user_id`);
  });
});
