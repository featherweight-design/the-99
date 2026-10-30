import { describe, expect, it } from "vitest";
import type { Account } from "./accounts";
import { buildInviteTree, filterTree, flattenTree, treeDepth } from "./invite-tree-rule";

// The tree's flyer node (flyer trial PR 4a; Admin-Desktop A1): Hugh › [Flyer · Mox Boston › [Jun › Rosa, Dev], Colin].
const day = (d: number, m = 10) => new Date(Date.UTC(2026, m - 1, d, 12));
const accounts: Account[] = ["Hugh", "Jun", "Rosa", "Dev", "Colin"].map((name) => ({ id: `u_${name.toLowerCase()}`, name, email: null, named: true }));
const build = (over: Partial<Parameters<typeof buildInviteTree>[0]> = {}) =>
  buildInviteTree({
    accounts,
    ownerId: "u_hugh",
    balances: new Map([["u_hugh", 37], ["u_jun", 2]]),
    open: [],
    flyerCodes: [{ id: "c1", code: "MOX4QK", label: "Mox Boston", capacity: 50, createdBy: "u_hugh", createdAt: day(30) }],
    flyerEdges: [
      { codeId: "c1", invitee: "u_dev", joinedAt: day(1, 11) },
      { codeId: "c1", invitee: "u_jun", joinedAt: day(31) },
    ],
    edges: [
      { inviter: "u_hugh", invitee: "u_colin", kind: "email", joinedAt: day(16) },
      { inviter: "u_jun", invitee: "u_rosa", kind: "email", joinedAt: day(1, 11) },
    ],
    now: day(2, 11),
    ...over,
  });
const shape = () =>
  flattenTree(build().roots).map((r) => `${r.cells.join(",") || "-"} ${r.kind === "flyer" ? `${r.store} ${r.code} ${r.taken}` : r.kind === "account" ? `${r.name}${r.joined ? ` (${r.joined})` : ""}` : r.kind}`);

describe("the tree's flyer node", () => {
  it("sits under its maker, before his invitees, with its sign-ups under it by join date", () => {
    expect(shape()).toEqual([
      "- Hugh",
      "tv Mox Boston MOX4QK 2",
      "v,tv Jun (Oct 31)",
      "v,v,t Rosa (Nov 1)",
      "v,t Dev (Nov 1)",
      "t Colin (Oct 16)",
    ]);
  });

  it("makes sign-ups non-roots, and draws no node for a code with no sign-ups", () => {
    const t = build();
    expect(t.roots.map((r) => (r.kind === "account" ? r.name : r.kind))).toEqual(["Hugh"]);
    expect(t.accounts).toBe(5);
    // The header total counts friend invites only: the two flyer sign-ups hang under their code, not under an inviter.
    expect(t.invited).toBe(2);
    const none = build({ flyerEdges: [] });
    expect(flattenTree(none.roots).some((r) => r.kind === "flyer")).toBe(false);
  });

  it("counts the flyer's holds against its maker's left, and keeps the depth", () => {
    expect(treeDepth(build().roots)).toBe(3);
    const hold = { kind: "email", state: "reserved", qrExpiresAt: null, holdsUntil: day(2, 11), userId: "u_hugh" } as const;
    const left = (t: ReturnType<typeof build>) => (t.roots[0].kind === "account" ? t.roots[0].left : -1);
    expect(left(build())).toBe(37);
    expect(left(build({ flyer: [{ ...hold, holdsUntil: new Date(day(2, 11).getTime() + 60_000) }] }))).toBe(36);
  });

  it("keeps the line to a matched sign-up, node included, and drops the node when none match", () => {
    expect(flattenTree(filterTree(build().roots, "rosa")).map((r) => r.kind)).toEqual(["account", "flyer", "account", "account"]);
    expect(flattenTree(filterTree(build().roots, "colin")).map((r) => r.kind)).toEqual(["account", "account"]);
  });
});
