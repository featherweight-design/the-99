// The flyer spend against a scripted fake database: reads answer in the order the function asks them, writes are recorded.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  reads: [] as unknown[][],
  writes: [] as { op: string; table: unknown; values?: unknown }[],
  welcome: vi.fn(),
  profile: vi.fn(),
  /** What Hugh's decrement `returning()` answers: one row when it moved, none when his balance row is gone. */
  lowered: [{ userId: "hugh" }] as unknown[],
}));

function chain(result: () => unknown[]) {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "for"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve().then(result).then(res, rej);
  return c;
}
const fakeTx = {
  execute: async () => ({ rows: [{ id: "hugh" }, { id: "user_new" }] }),
  select: () => chain(() => h.reads.shift() ?? []),
  update: (table: unknown) => ({
    set: (values: unknown) => ({
      where: () => {
        h.writes.push({ op: "update", table, values });
        const done = Promise.resolve(undefined);
        return Object.assign(done, { returning: async () => (table === inviteBalances ? h.lowered : []) });
      },
    }),
  }),
  insert: (table: unknown) => ({
    values: (values: unknown) => ({ onConflictDoNothing: async () => { h.writes.push({ op: "insert", table, values }); } }),
  }),
};
vi.mock("../../db", () => ({
  db: { select: () => chain(() => h.reads.shift() ?? []), transaction: async (cb: (tx: unknown) => unknown) => cb(fakeTx) },
}));
vi.mock("../account/purge", () => ({ tombstoneHash: (id: string) => `hash:${id}` }));
vi.mock("../invites/send", () => ({ lockSenderIn: async (_tx: unknown, _id: string, given?: Date) => given ?? new Date() }));
vi.mock("../social/friends", () => ({ welcomeInvitedIn: h.welcome, createProfileIn: h.profile }));

import { flagGroupMembers, flyerClaims, inviteBalances } from "../../db/schema";
import { spendFlyerOnSignUp } from "./spend";

const CLAIM = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";
const now = new Date("2026-10-30T12:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);
const claim = (over: object = {}) => ({ id: CLAIM, codeId: "c1", state: "proven", holdsUntil: at(60_000), userId: null, ...over });
const code = (over: object = {}) => ({ id: "c1", createdBy: "hugh", groupId: "g1", revokedAt: null, ...over });

/** The reads in the order the spend asks: the claim's code, a spend already recorded, a tombstone, the claim, the code, the creator's tombstone. */
function script(opts: { found?: boolean; done?: boolean; gone?: boolean; claim?: object | null; code?: object | null; creatorGone?: boolean } = {}) {
  h.reads = [
    opts.found === false ? [] : [{ hugh: "hugh" }],
    opts.done ? [{ id: CLAIM }] : [],
    opts.gone ? [{ id: "hash:user_new" }] : [],
    opts.claim === null ? [] : [claim(opts.claim)],
    opts.code === null ? [] : [code(opts.code)],
    opts.creatorGone ? [{ id: "hash:hugh" }] : [],
  ];
}
const wrote = (table: unknown) => h.writes.filter((w) => w.table === table);

beforeEach(() => {
  h.reads = [];
  h.writes = [];
  h.welcome.mockReset();
  h.profile.mockReset();
  h.lowered = [{ userId: "hugh" }];
});

describe("spendFlyerOnSignUp", () => {
  it("spends the claim, joins the code's group, writes a profile and gives three invites", async () => {
    script();
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: true });
    expect(wrote(flyerClaims)[0].values).toMatchObject({ state: "spent", userId: "user_new", email: null, codeHmac: null, resolvedAt: now });
    expect(wrote(flagGroupMembers)[0].values).toEqual({ userId: "user_new", groupId: "g1", addedBy: "hugh" });
    expect(h.profile).toHaveBeenCalledWith(expect.anything(), "user_new", "Ana");
    const balances = wrote(inviteBalances);
    expect(balances).toHaveLength(2);
    expect(balances[1].values).toMatchObject({ userId: "user_new", held: 3 });
  });

  it("spends nothing when Hugh's decrement moves no row (a purged creator has no balance)", async () => {
    script();
    h.lowered = [];
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "lapsed" });
    expect(wrote(flyerClaims)).toHaveLength(0);
    expect(wrote(flagGroupMembers)).toHaveLength(0);
    expect(h.profile).not.toHaveBeenCalled();
    expect(wrote(inviteBalances)).toHaveLength(1);
  });

  it("spends nothing when the code's creator has a deletion tombstone", async () => {
    script({ creatorGone: true });
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "lapsed" });
    expect(h.writes).toHaveLength(0);
  });

  it("lowers Hugh's held by the one the claim held, and makes no friend link", async () => {
    script();
    await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now });
    const [dec] = wrote(inviteBalances);
    expect(h.writes[0].table).toBe(inviteBalances);
    expect(dec.op).toBe("update");
    expect(h.welcome).not.toHaveBeenCalled();
  });

  it("joins no group for a code with none, and falls back to Player for an unusable name", async () => {
    script({ code: { groupId: null } });
    await spendFlyerOnSignUp("user_new", CLAIM, null, { now });
    expect(wrote(flagGroupMembers)).toHaveLength(0);
    expect(h.profile).toHaveBeenCalledWith(expect.anything(), "user_new", null);
  });

  it("is idempotent: a spend already recorded for the account, or a spent claim of theirs, writes nothing", async () => {
    script({ done: true });
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "already" });
    script({ claim: { state: "spent", userId: "user_new" } });
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "already" });
    expect(h.writes).toHaveLength(0);
  });

  it("spends nothing on a lapsed, released or unheld claim", async () => {
    for (const over of [{ holdsUntil: at(-1) }, { state: "released" }, { state: "spent", userId: "someone_else" }]) {
      script({ claim: over });
      expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "lapsed" });
    }
    expect(h.writes).toHaveLength(0);
  });

  it("spends nothing on a revoked code", async () => {
    script({ code: { revokedAt: at(-1000) } });
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "lapsed" });
    expect(h.writes).toHaveLength(0);
  });

  it("spends nothing for a deleted account", async () => {
    script({ gone: true });
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "deleted" });
    expect(h.writes).toHaveLength(0);
  });

  it("reads an unknown or malformed claim id as unknown", async () => {
    script({ found: false });
    expect(await spendFlyerOnSignUp("user_new", CLAIM, "Ana", { now })).toEqual({ spent: false, reason: "unknown" });
    expect(await spendFlyerOnSignUp("user_new", "nope", "Ana", { now })).toEqual({ spent: false, reason: "unknown" });
    expect(h.writes).toHaveLength(0);
  });
});
