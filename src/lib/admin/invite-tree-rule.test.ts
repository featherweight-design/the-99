import { describe, expect, it } from "vitest";
import type { Account } from "./accounts";
import { buildInviteTree, filterTree, flattenTree, treeDepth, type TreeRow } from "./invite-tree-rule";
import type { Edge, ReservationRow } from "./invites-rule";

// The Invites tab's tree (plan `2026-10-16-invites.md`, PR 6b; handoff Admin M4), pure: the board's own tree
// (Hugh › [Colin › [Peter, a waiting invite], Max › [a waiting invite]], Chris), its rail cells, the deleted sides
// and the search cut.

const now = new Date("2026-10-20T12:00:00Z");
const day = (d: number, h = 12) => new Date(Date.UTC(2026, 9, d, h));
const accounts: Account[] = [
  { id: "u_hugh", name: "Hugh", email: "hugh@example.com" },
  { id: "u_chris", name: "Chris", email: null },
  { id: "u_colin", name: "Colin", email: null },
  { id: "u_max", name: "Max", email: null },
  { id: "u_peter", name: "Peter", email: null },
];
const edges: Edge[] = [
  { inviter: "u_hugh", invitee: "u_max", kind: "qr", joinedAt: day(20, 9) },
  { inviter: "u_hugh", invitee: "u_colin", kind: "email", joinedAt: day(18) },
  { inviter: "u_colin", invitee: "u_peter", kind: "email", joinedAt: day(19) },
];
const reservation = (over: Partial<ReservationRow>): ReservationRow => ({
  id: "r1", userId: "u_colin", kind: "email", state: "reserved", qrExpiresAt: null, holdsUntil: day(27), email: "m.chen@example.com", ...over,
});
const open = [
  reservation({}),
  reservation({ id: "r2", userId: "u_max", kind: "qr", state: "claimed", email: "j.ruiz@example.com", holdsUntil: day(26) }),
  // Still a QR on screen: it holds an invite but is not a waiting leaf. And one past its hold: not waiting at all.
  reservation({ id: "r3", userId: "u_hugh", kind: "qr", state: "qr_open", qrExpiresAt: day(20, 13), holdsUntil: null, email: null }),
  reservation({ id: "r4", userId: "u_hugh", holdsUntil: day(19) }),
];
const balances = new Map([["u_hugh", 6], ["u_colin", 3], ["u_chris", 3]]);
const build = (over: Partial<Parameters<typeof buildInviteTree>[0]> = {}) =>
  buildInviteTree({ accounts, ownerId: "u_hugh", balances, open, edges, now, ...over });
const shape = (rows: TreeRow[]) =>
  rows.map((r) => `${r.cells.join(",") || "-"} ${r.kind === "account" ? r.name : r.kind === "waiting" ? `waiting ${r.email}` : "deleted"}`);

describe("the invite tree", () => {
  it("draws the board's tree: founders in list order, invitees by join date, then each account's waiting invites", () => {
    expect(shape(flattenTree(build().roots))).toEqual([
      "- Hugh",
      "tv Colin",
      "v,tv Peter",
      "v,t waiting m.chen@example.com",
      "t Max",
      "blank,t waiting j.ruiz@example.com",
      "- Chris",
    ]);
  });

  it("gives each account its figures: owner, joined day, left (as the count line reads it) and how many it invited", () => {
    const rows = flattenTree(build().roots).filter((r) => r.kind === "account");
    const by = Object.fromEntries(rows.map((r) => [r.name, r]));
    // Hugh holds 6 with one QR on screen: 5 left.
    expect(by.Hugh).toMatchObject({ owner: true, joined: null, left: 5, invited: 2, initials: "H" });
    expect(by.Colin).toMatchObject({ owner: false, joined: "Oct 18", left: 2, invited: 1 });
    expect(by.Peter).toMatchObject({ joined: "Oct 19", left: 0, invited: 0 });
    const waiting = flattenTree(build().roots).find((r) => r.kind === "waiting" && r.id === "r2");
    expect(waiting).toMatchObject({ how: "in person", returns: "Oct 26" });
  });

  it("counts the accounts drawn, the accounts that joined on an invite, and the invites waiting", () => {
    expect(build()).toMatchObject({ accounts: 5, invited: 3, waiting: 2 });
  });

  it("draws a deleted invitee as a leaf under its inviter, and a deleted inviter's invitees under one root last", () => {
    const t = build({
      accounts: accounts.filter((a) => a.id !== "u_colin"),
      edges: [
        { inviter: "u_hugh", invitee: null, kind: "email", joinedAt: day(18) },
        { inviter: null, invitee: "u_peter", kind: "email", joinedAt: day(19) },
        { inviter: "u_hugh", invitee: "u_max", kind: "qr", joinedAt: day(20, 9) },
      ],
      open: [],
      balances: new Map(),
    });
    expect(shape(flattenTree(t.roots))).toEqual(["- Hugh", "tv deleted", "t Max", "- Chris", "- deleted", "t Peter"]);
    expect(t.invited).toBe(2);
  });

  it("still draws an account Clerk did not list, by its id", () => {
    const t = build({ accounts: accounts.filter((a) => a.id !== "u_peter") });
    expect(shape(flattenTree(t.roots))).toContain("v,tv u_peter");
  });

  it("with Clerk down, still draws a sender known only by a stock or an open reservation, with its waiting invite", () => {
    const t = build({
      accounts: [],
      edges: [],
      balances: new Map([["u_quiet", 2]]),
      open: [reservation({ id: "r9", userId: "u_lone", email: "x@example.com" })],
    });
    expect(shape(flattenTree(t.roots))).toEqual(["- u_quiet", "- u_lone", "t waiting x@example.com"]);
    expect(t.waiting).toBe(1);
  });

  it("measures the deepest level below the roots", () => {
    expect(treeDepth(build().roots)).toBe(2);
    expect(treeDepth([])).toBe(0);
  });

  it("cuts to the accounts a search names, keeping the line from the root and what waits under a match", () => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    expect(shape(flattenTree(filterTree(build().roots, "pet", byId)))).toEqual(["- Hugh", "t Colin", "blank,t Peter"]);
    expect(shape(flattenTree(filterTree(build().roots, "colin", byId)))).toEqual([
      "- Hugh",
      "t Colin",
      "blank,tv Peter",
      "blank,t waiting m.chen@example.com",
    ]);
    // An address an account holds matches too; a waiting invite's address does not.
    expect(shape(flattenTree(filterTree(build().roots, "hugh@", byId)))[0]).toBe("- Hugh");
    expect(flattenTree(filterTree(build().roots, "m.chen", byId))).toEqual([]);
    expect(filterTree(build().roots, "  ", byId)).toEqual(build().roots);
  });
});
