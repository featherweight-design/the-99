import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  reads: [] as unknown[][],
  writes: [] as { op: string; table: unknown; values?: unknown }[],
  welcome: vi.fn(),
}));
function chain(result: () => unknown[]) {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "for"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve().then(result).then(res, rej);
  return c;
}
const fakeTx = {
  execute: async () => ({ rows: [{ id: "inviter" }, { id: "user_new" }] }),
  select: () => chain(() => h.reads.shift() ?? []),
  update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { h.writes.push({ op: "update", table, values }); } }) }),
  insert: (table: unknown) => ({
    values: (values: unknown) => ({ onConflictDoNothing: async () => { h.writes.push({ op: "insert", table, values }); } }),
  }),
};
vi.mock("../../db", () => ({
  db: { select: () => chain(() => h.reads.shift() ?? []), transaction: async (cb: (tx: unknown) => unknown) => cb(fakeTx) },
}));
vi.mock("../account/purge", () => ({ tombstoneHash: (id: string) => `hash:${id}` }));
vi.mock("./send", () => ({ lockSenderIn: async (_tx: unknown, _id: string, given?: Date) => given ?? new Date() }));
vi.mock("../social/friends", () => ({ welcomeInvitedIn: h.welcome }));

import { flagGroupMembers, inviteEdges } from "../../db/schema";
import { reservationIdFrom, spendInviteOnSignUp } from "./spend";

const ID = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

describe("reservationIdFrom (the invitation's public metadata, R8)", () => {
  it("reads the reservation id our invitation carries", () => {
    expect(reservationIdFrom({ inviteReservation: ID })).toBe(ID);
    expect(reservationIdFrom({ inviteReservation: ID.toUpperCase() })).toBe(ID.toUpperCase());
  });
  it("reads nothing from an account with no invitation, or anything that is not an id", () => {
    for (const meta of [undefined, null, "x", 7, {}, { inviteReservation: "" }, { inviteReservation: 42 }, { inviteReservation: `${ID} ` }, { inviteReservation: "not-a-uuid" }, { other: ID }]) {
      expect(reservationIdFrom(meta)).toBeNull();
    }
  });
});

describe("spendInviteOnSignUp: the invitee joins no group", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  const reservation = { id: ID, userId: "inviter", kind: "email", state: "reserved", codeTries: 0, holdsUntil: new Date(now.getTime() + 60_000) };
  /** The reads in order: the reservation's sender, a recorded edge, a tombstone, the reservation, an edge. */
  const script = () => { h.reads = [[{ senderId: "inviter" }], [], [], [reservation], []]; };
  const groupWrites = () => h.writes.filter((w) => w.table === flagGroupMembers);

  beforeEach(() => {
    h.reads = [];
    h.writes = [];
    h.welcome.mockReset();
  });

  it("records the edge and befriends the inviter, and puts the invitee in no flag group", async () => {
    script();
    expect(await spendInviteOnSignUp("user_new", ID, "Ana", { now })).toEqual({ spent: true });
    expect(groupWrites()).toHaveLength(0);
    expect(h.writes.some((w) => w.table === inviteEdges && (w.values as { inviteeUserId: string }).inviteeUserId === "user_new")).toBe(true);
    expect(h.welcome).toHaveBeenCalledWith(expect.anything(), "inviter", "user_new", "Ana");
  });

  it("gives the invitee of a flyer member no flag_group_members row, in the flyer group or any other", async () => {
    // The inviter below has a spent flyer claim and a group; with the old inheritance these reads were consumed and a row written.
    script();
    h.reads.push([{ admin: "hugh" }], [{ groupId: "g1" }]);
    await spendInviteOnSignUp("user_new", ID, "Ana", { now });
    expect(h.reads).toHaveLength(2);
    expect(groupWrites()).toHaveLength(0);
  });
});
