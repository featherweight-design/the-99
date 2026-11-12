import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The key writes against a scripted database: each select answers the next queued rows, each insert the next queued
 * result, and every call is logged in order, so the lock, the retire and the mint are pinned as a sequence.
 */
const state = vi.hoisted(() => ({ selects: [] as unknown[][], inserts: [] as unknown[][], log: [] as { op: string; arg?: unknown }[] }));

vi.mock("../../db", () => {
  const chain = (result: () => unknown, op: string): unknown => {
    const p: object = new Proxy(function () {}, {
      get(_t, key) {
        if (key === "then") return (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve().then(result).then(ok, bad);
        return (arg?: unknown) => {
          if (key === "set") state.log.push({ op: `${op}.set`, arg });
          if (key === "values") state.log.push({ op: `${op}.values`, arg });
          return p;
        };
      },
    });
    return p;
  };
  const q = {
    select: () => { state.log.push({ op: "select" }); return chain(() => state.selects.shift() ?? [], "select"); },
    insert: () => { state.log.push({ op: "insert" }); return chain(() => state.inserts.shift() ?? [], "insert"); },
    update: () => { state.log.push({ op: "update" }); return chain(() => [], "update"); },
    execute: (s: { queryChunks?: unknown[] }) => { state.log.push({ op: "execute", arg: JSON.stringify(s?.queryChunks ?? "") }); return Promise.resolve({ rows: [] }); },
    transaction: async (fn: (tx: unknown) => unknown) => { state.log.push({ op: "begin" }); return fn(q); },
  };
  return { db: q };
});

import { deriveFriendCode, deriveLinkToken, linkTokenHash, ownLinkKey, resetLinkKey, unlinkLinkKeysIn } from "./friend-link-keys";

const SECRET = "c".repeat(64);
const ROTATED = "d".repeat(64);
const ID = "4f2b8a3e-7c1d-4e9a-9b6f-0123456789ab";
const NOW = new Date("2026-11-12T12:00:00Z");
const liveRow = (secret: string) => ({ id: ID, tokenHash: linkTokenHash(secret, deriveLinkToken(secret, ID)), createdAt: NOW });
const ops = () => state.log.map((l) => l.op);

beforeEach(() => {
  state.selects = [];
  state.inserts = [];
  state.log = [];
});

describe("ownLinkKey", () => {
  it("shows the live pair from one plain read, with no lock and no write", async () => {
    state.selects = [[liveRow(SECRET)]];
    const out = await ownLinkKey("u1", SECRET, NOW);
    expect(out).toEqual({ ok: true, key: { token: deriveLinkToken(SECRET, ID), code: deriveFriendCode(SECRET, ID), createdAt: NOW } });
    expect(ops()).toEqual(["select"]);
  });

  it("retires a row the rotated key no longer derives and mints under the owner's lock", async () => {
    state.selects = [[liveRow(SECRET)], [liveRow(SECRET)], [{ userId: "u1" }]];
    state.inserts = [[{ id: "new" }]];
    const out = await ownLinkKey("u1", ROTATED, NOW);
    expect(out.ok).toBe(true);
    expect(ops()).toEqual(["select", "begin", "execute", "select", "update", "update.set", "select", "insert", "insert.values"]);
    expect(state.log[2].arg).toContain("friend-link-key:u1");
    expect(state.log[5].arg).toEqual({ retiredAt: NOW });
  });

  it("mints nothing for an account with no profile (a purged one)", async () => {
    state.selects = [[], [], []];
    expect(await ownLinkKey("gone", SECRET, NOW)).toEqual({ ok: false, reason: "noProfile" });
    expect(ops()).not.toContain("insert");
  });

  it("tries another id when a mint clashes with a code already issued", async () => {
    state.selects = [[], [], [{ userId: "u1" }]];
    state.inserts = [[], [{ id: "second" }]];
    expect((await ownLinkKey("u1", SECRET, NOW)).ok).toBe(true);
    expect(ops().filter((o) => o === "insert")).toHaveLength(2);
  });

  it("writes nothing without the key", async () => {
    expect(await ownLinkKey("u1", null, NOW)).toEqual({ ok: false, reason: "unconfigured" });
    expect(ops()).toEqual([]);
  });
});

describe("resetLinkKey", () => {
  it("retires the live pair and mints the next, under the owner's lock", async () => {
    state.selects = [[{ userId: "u1" }]];
    state.inserts = [[{ id: "next" }]];
    const out = await resetLinkKey("u1", SECRET, NOW);
    expect(out.ok).toBe(true);
    expect(ops()).toEqual(["begin", "execute", "update", "update.set", "select", "insert", "insert.values"]);
    expect(state.log[1].arg).toContain("friend-link-key:u1");
  });
});

describe("unlinkLinkKeysIn", () => {
  it("takes the owner's lock, then unlinks and retires every key of the account", async () => {
    const { db } = await import("../../db");
    await unlinkLinkKeysIn(db as never, "u1", NOW);
    expect(ops()).toEqual(["execute", "update", "update.set"]);
    expect(state.log[0].arg).toContain("friend-link-key:u1");
    expect((state.log[2].arg as { userId: unknown }).userId).toBeNull();
    expect(state.log[2].arg).toHaveProperty("retiredAt");
  });
});
