import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** `openLinkJoin` and `showInviteQr` against a scripted transaction: selects answer queued rows; writes and filters are logged. */
const h = vi.hoisted(() => ({
  selects: [] as unknown[][],
  inserted: [] as Record<string, unknown>[],
  wheres: [] as unknown[],
  live: true,
  out: false,
  key: { id: "key-1", userId: "owner" } as { id: string; userId: string } | null,
  flags: { FRIEND_LINKS_ENABLED: "true" } as Record<string, string>,
}));

vi.mock("../../db", () => {
  const chain = (result: () => unknown): unknown => {
    const p: object = new Proxy(function () {}, {
      get(_t, key) {
        if (key === "then") return (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve().then(result).then(ok, bad);
        return (arg?: unknown) => {
          if (key === "where") h.wheres.push(arg);
          if (key === "values") h.inserted.push(arg as Record<string, unknown>);
          return p;
        };
      },
    });
    return p;
  };
  const tx = {
    select: () => chain(() => h.selects.shift() ?? []),
    insert: () => chain(() => []),
    update: () => chain(() => []),
    execute: async () => ({ rows: [] }),
  };
  return { db: { ...tx, transaction: async (fn: (t: unknown) => unknown) => fn(tx) } };
});
vi.mock("../social/friend-link-keys", () => ({
  liveLinkKeyIn: async () => h.key,
  holdLiveKeyIn: async () => h.live,
}));
vi.mock("../flags/snapshot", () => ({ resolveFlagsStrict: async () => h.flags }));
vi.mock("./read", async (orig) => ({
  ...(await orig<typeof import("./read")>()),
  readCountIn: async () => ({ held: 3, holding: 0, count: { left: h.out ? 0 : 3, waiting: 0, liveQr: false, qrUntil: null, out: h.out } }),
}));

import { CODE_TTL_MS } from "./rules";
import { openLinkJoin } from "./link-join";
import { showInviteQr } from "./send";

const SECRET = "f".repeat(64);
const NOW = new Date("2026-11-12T12:00:00Z");
const TOKEN = "A".repeat(22);
const render = (w: unknown) => new PgDialect().sqlToQuery(w as SQL).sql;

beforeEach(() => {
  h.selects = [];
  h.inserted = [];
  h.wheres = [];
  h.live = true;
  h.out = false;
  h.key = { id: "key-1", userId: "owner" };
  h.flags = { FRIEND_LINKS_ENABLED: "true" };
});

describe("openLinkJoin", () => {
  it("opens a ten-minute QR-kind row on the owner's invite, tagged with the link, and returns its token", async () => {
    h.selects = [[]];
    const out = await openLinkJoin(TOKEN, SECRET, { now: NOW });
    expect(out.ok).toBe(true);
    expect(h.inserted).toHaveLength(1);
    expect(h.inserted[0]).toMatchObject({ userId: "owner", kind: "qr", state: "qr_open", linkKeyId: "key-1", qrExpiresAt: new Date(NOW.getTime() + CODE_TTL_MS) });
  });

  it("counts only this link's holds, and refuses the third", async () => {
    const live = { kind: "qr", state: "qr_open", qrExpiresAt: new Date(NOW.getTime() + 60_000), holdsUntil: null };
    h.selects = [[live, live]];
    expect(await openLinkJoin(TOKEN, SECRET, { now: NOW })).toEqual({ ok: false, reason: "busy" });
    expect(h.wheres.map(render).some((s) => s.includes(`"link_key_id" = $`))).toBe(true);
    expect(h.inserted).toHaveLength(0);
  });

  it("refuses when the owner is out of invites", async () => {
    h.out = true;
    expect(await openLinkJoin(TOKEN, SECRET, { now: NOW })).toEqual({ ok: false, reason: "out" });
    expect(h.inserted).toHaveLength(0);
  });

  it("reads a link reset mid-Join, or an owner with the switch off, as ended", async () => {
    h.live = false;
    expect(await openLinkJoin(TOKEN, SECRET, { now: NOW })).toEqual({ ok: false, reason: "ended" });
    h.live = true;
    h.flags = {};
    expect(await openLinkJoin(TOKEN, SECRET, { now: NOW })).toEqual({ ok: false, reason: "ended" });
    expect(h.inserted).toHaveLength(0);
  });
});

describe("showInviteQr", () => {
  it("never shows a friend link's newcomer row as the sender's own QR", async () => {
    h.selects = [[]];
    await showInviteQr("owner", SECRET, NOW);
    expect(render(h.wheres[0])).toContain(`"link_key_id" is null`);
  });
});
