import { describe, expect, it } from "vitest";
import { adminCopy } from "../copy/admin";
import {
  accountInvites,
  invitedBy,
  invitedByName,
  phoneInviteMeta,
  rowInvites,
  setDraft,
  topUpDraft,
  type Edge,
  type ReservationRow,
} from "./invites-rule";

// Invites in the admin (plan `2026-10-16-invites.md`, PR 6), pure: M1's figures and inviter (a founder, a deleted
// account, an account), M2's section (who it invited, what waits, the merged history) and both pending sentences.

const now = new Date("2026-10-20T12:00:00Z");
const day = (d: number, h = 12) => new Date(Date.UTC(2026, 9, d, h));
const accounts = [
  { id: "u_hugh", name: "Hugh", email: null, named: true },
  { id: "u_colin", name: "Colin", email: null, named: true },
  { id: "u_peter", name: "Peter", email: null, named: true },
];
const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
const reservation = (over: Partial<ReservationRow>): ReservationRow => ({
  id: "r1", userId: "u_colin", kind: "email", state: "reserved", qrExpiresAt: null, holdsUntil: day(27), email: "m.chen@example.com", ...over,
});

describe("who invited an account", () => {
  const edges: Edge[] = [
    { inviter: "u_hugh", invitee: "u_colin", kind: "email", joinedAt: day(18) },
    { inviter: null, invitee: "u_peter", kind: "qr", joinedAt: day(19) },
  ];
  it("is a founder with no edge naming it, a deleted account when the inviter is gone, else the inviter", () => {
    expect(invitedBy("u_hugh", edges, name)).toEqual({ kind: "founder" });
    expect(invitedBy("u_peter", edges, name)).toEqual({ kind: "deleted", joinedAt: day(19) });
    expect(invitedBy("u_colin", edges, name)).toEqual({ kind: "account", id: "u_hugh", name: "Hugh", joinedAt: day(18) });
    expect(["u_hugh", "u_peter", "u_colin"].map((id) => invitedByName(invitedBy(id, edges, name)))).toEqual(["founder", "deleted account", "Hugh"]);
  });

  it("counts every row's left and waiting through inviteCount, a missing stock as 0", () => {
    const rows = rowInvites({
      ids: ["u_hugh", "u_colin", "u_peter"],
      balances: new Map([["u_colin", 3], ["u_hugh", 5]]),
      // Colin's reservation holds; his lapsed one and an expired QR hold nothing.
      open: [reservation({}), reservation({ id: "r2", holdsUntil: day(19) }), reservation({ id: "r3", kind: "qr", state: "qr_open", holdsUntil: null, qrExpiresAt: day(19) })],
      edges,
      accounts,
      now,
    });
    expect(rows.get("u_hugh")).toEqual({ left: 5, waiting: 0, invitedBy: { kind: "founder" } });
    expect(rows.get("u_colin")).toMatchObject({ left: 2, waiting: 1, invitedBy: { kind: "account", name: "Hugh" } });
    expect(rows.get("u_peter")).toMatchObject({ left: 0, waiting: 0, invitedBy: { kind: "deleted" } });
    expect(phoneInviteMeta(rows.get("u_hugh")!)).toEqual({ figure: "5", after: " invites", by: "founder" });
    expect(phoneInviteMeta(rows.get("u_colin")!)).toEqual({ figure: "2", after: " · 1 waiting", by: "by Hugh" });
    expect(phoneInviteMeta(rows.get("u_peter")!)).toEqual({ figure: "0", after: " invites", by: "by deleted account" });
  });
});

describe("an account's Invites section (M2)", () => {
  const base = {
    userId: "u_colin",
    held: 5,
    open: [reservation({}), reservation({ id: "r2", kind: "qr", state: "claimed", holdsUntil: day(28), email: "j.ruiz@example.com" }), reservation({ id: "r3", kind: "qr", state: "qr_open", holdsUntil: null, qrExpiresAt: new Date(now.getTime() + 60_000), email: null })],
    edges: [
      { inviter: "u_hugh", invitee: "u_colin", kind: "email" as const, joinedAt: day(18) },
      { inviter: "u_colin", invitee: "u_peter", kind: "qr" as const, joinedAt: day(19, 9) },
      { inviter: "u_colin", invitee: null, kind: "email" as const, joinedAt: day(17) },
    ],
    events: [
      { at: day(14, 10), actorId: "u_hugh", kind: "invites_set", userId: "u_colin", oldValue: "1", newValue: "4" },
      { at: day(16), actorId: "u_admin2", kind: "invite_revoked", userId: "u_colin", oldValue: null, newValue: null },
    ],
    // The raw holds_until: the send line is dated a hold earlier (Oct 20).
    holdsUntil: [day(27)],
    accounts,
    viewerId: "u_hugh",
    limit: 100,
    now,
  };

  it("draws left, waiting (the QR aside), spent, the inviter, whom it invited newest first, and each waiting invite by its masked address", () => {
    const s = accountInvites(base);
    // 5 held, 3 holding: 2 left; the live QR holds but does not wait.
    expect([s.left, s.waiting, s.spent]).toEqual([2, 2, 2]);
    expect(s.invitedBy).toEqual({ kind: "account", id: "u_hugh", name: "Hugh", joinedAt: day(18) });
    expect(s.invited).toEqual([
      { id: "u_peter", name: "Peter", joined: "Oct 19" },
      { id: null, name: "deleted account", joined: "Oct 17" },
    ]);
    expect(s.waitingLines).toEqual([
      { id: "r1", how: "by email", email: "m•••@e•••.com", sent: "Oct 20", returns: "Oct 27" },
      { id: "r2", how: "in person", email: "j•••@e•••.com", sent: "Oct 21", returns: "Oct 28" },
    ]);
  });

  it("merges the events, the sends and the joins newest first, says You for the viewer, and cuts at the limit", () => {
    const s = accountInvites(base);
    expect(s.history.map((h) => [h.when, h.what, h.note])).toEqual([
      ["20 Oct · 12:00", "Colin sent an invitation: 1 waiting", null],
      ["19 Oct · 09:00", "Peter joined on Colin’s invite", null],
      ["17 Oct · 12:00", "deleted account joined on Colin’s invite", null],
      ["16 Oct · 12:00", "Account ·min2 revoked a waiting invite of Colin’s", null],
      ["14 Oct · 10:00", "You set Colin’s invites: 1 → 4", null],
    ]);
    expect(s.historyCut).toBe(false);
    const cut = accountInvites({ ...base, limit: 2 });
    expect(cut.history.map((h) => h.what)).toEqual(["Colin sent an invitation: 1 waiting", "Peter joined on Colin’s invite"]);
    expect(cut.historyCut).toBe(true);
  });

  it("reads a founder with no stock as 0 left", () => {
    const s = accountInvites({ ...base, userId: "u_hugh", held: undefined, open: [], edges: [], events: [], holdsUntil: [] });
    expect([s.left, s.waiting, s.spent, s.invitedBy.kind]).toEqual([0, 0, 0, "founder"]);
  });
});

describe("the pending sentences", () => {
  it("M2: same, invalid, or a new left; the sentence names what waits", () => {
    expect(setDraft("2", 2)).toEqual({ kind: "same" });
    expect(setDraft("  ", 2)).toEqual({ kind: "same" });
    expect(setDraft("1001", 2)).toEqual({ kind: "invalid" });
    expect(setDraft("2.5", 2)).toEqual({ kind: "invalid" });
    expect(setDraft("-1", 2)).toEqual({ kind: "invalid" });
    expect(setDraft(" 4 ", 2)).toEqual({ kind: "pending", to: 4 });
    const p = adminCopy.invites.pendingSet;
    expect(p("Colin", 2, 4, 0)).toBe("Saving sets Colin’s invites from 2 to 4.");
    expect(p("Colin", 2, 4, 1)).toBe("Saving sets Colin’s invites from 2 to 4. The one waiting stays waiting.");
    expect(p("Colin", 2, 4, 3)).toBe("Saving sets Colin’s invites from 2 to 4. The 3 waiting stay waiting.");
  });

  it("M3: names who rises A to Z with what they hold, and how many already hold that many", () => {
    const members = [
      { id: "p", name: "Peter", left: 0 },
      { id: "c", name: "Colin", left: 2 },
      { id: "x", name: "Chris", left: 3 },
      { id: "m", name: "Max", left: 0 },
    ];
    expect(topUpDraft("", members)).toEqual({ kind: "empty" });
    expect(topUpDraft("x", members)).toEqual({ kind: "invalid" });
    const three = topUpDraft("3", members);
    expect(three).toMatchObject({ kind: "pending", to: 3, held: 1 });
    expect(three.kind === "pending" && three.raised.map((m) => m.id)).toEqual(["c", "m", "p"]);
    expect(three.kind === "pending" && three.sentence).toBe("Topping up raises 3 of 4 members to 3 invites left: Colin (2), Max (0), Peter (0). 1 already holds 3.");
    const one = topUpDraft("1", members);
    expect(one.kind === "pending" && one.sentence).toBe("Topping up raises 2 of 4 members to 1 invites left: Max (0), Peter (0). 2 already hold 1.");
    const four = topUpDraft("4", members);
    expect(four.kind === "pending" && four.sentence).toBe("Topping up raises 4 of 4 members to 4 invites left: Chris (3), Colin (2), Max (0), Peter (0).");
    const zero = topUpDraft("0", members);
    expect(zero).toMatchObject({ kind: "pending", raised: [], held: 4, sentence: "Nobody holds fewer than 0: topping up changes nothing." });
  });
});
