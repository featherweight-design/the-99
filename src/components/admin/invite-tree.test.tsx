// The Invites tab (plan `2026-10-16-invites.md`, PR 6b; handoff Admin M4): the tree's rows and rail cells, each
// account's press, the toolbar's search and counts, Revoke on a waiting leaf, and the empty and no-match states.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account } from "../../lib/admin/accounts";
import { buildInviteTree } from "../../lib/admin/invite-tree-rule";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/invites", useRouter: () => ({ refresh }) }));
const revoke = vi.fn();
vi.mock("../../app/admin/invites/actions", () => ({ revokeInvite: (...a: unknown[]) => revoke(...a) }));

const { InviteTreeView } = await import("./invite-tree");

const R1 = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-10-20T12:00:00Z");
const accounts: Account[] = [
  { id: "u_hugh", name: "Hugh", email: null },
  { id: "u_colin", name: "Colin", email: null },
  { id: "u_peter", name: "Peter", email: null },
];
const tree = buildInviteTree({
  accounts,
  ownerId: "u_hugh",
  balances: new Map([["u_hugh", 5], ["u_colin", 2]]),
  open: [{ id: R1, userId: "u_colin", kind: "email", state: "reserved", qrExpiresAt: null, holdsUntil: new Date("2026-10-27T12:00:00Z"), email: "m.chen@example.com" }],
  edges: [
    { inviter: "u_hugh", invitee: "u_colin", kind: "email", joinedAt: new Date("2026-10-18T12:00:00Z") },
    { inviter: "u_colin", invitee: "u_peter", kind: "email", joinedAt: new Date("2026-10-19T12:00:00Z") },
  ],
  now,
});
const view = (over: Partial<Parameters<typeof InviteTreeView>[0]> = {}) =>
  render(<InviteTreeView roots={tree.roots} accounts={tree.accounts} invited={tree.invited} waiting={tree.waiting} searchable={accounts} clerk="ok" {...over} />);

beforeEach(() => {
  revoke.mockReset().mockResolvedValue({ ok: true, changed: true });
  refresh.mockReset();
});

describe("InviteTreeView (M4)", () => {
  it("draws one tree of flat treeitems, nested by rail cells", () => {
    view();
    const t = screen.getByRole("tree", { name: "Who invited whom" });
    const items = within(t).getAllByRole("treeitem");
    expect(items.map((i) => i.getAttribute("aria-level"))).toEqual(["1", "2", "3", "3"]);
    expect([...items[2].querySelectorAll("[data-rail]")].map((c) => c.getAttribute("data-rail"))).toEqual(["blank", "tv"]);
    expect([...items[3].querySelectorAll("[data-rail]")].map((c) => c.getAttribute("data-rail"))).toEqual(["blank", "t"]);
    expect(items[0].querySelector("[data-rail]")).toBeNull();
  });

  it("names the owner, each joined day and figures, and opens an account from its row", () => {
    view();
    const hugh = document.querySelector('[data-node="u_hugh"]')!;
    expect(hugh).toHaveTextContent("owner");
    expect(hugh).toHaveTextContent("5 left · invited 1");
    const colin = document.querySelector('[data-node="u_colin"]')!;
    expect(colin).toHaveTextContent("joined Oct 18");
    // Colin holds 2 and one waits: 1 left.
    expect(colin).toHaveTextContent("Oct 18 · 1 left · invited 1");
    const opens = within(colin as HTMLElement).getAllByRole("link");
    expect(opens.map((l) => l.getAttribute("href"))).toEqual(["/admin/accounts/u_colin", "/admin/accounts/u_colin"]);
    expect(within(colin as HTMLElement).getByRole("link", { name: "Open Colin" })).toBeTruthy();
  });

  it("draws a waiting leaf with how it was sent, its address and its return, and revokes it", async () => {
    view();
    const leaf = document.querySelector(`[data-waiting="${R1}"]`) as HTMLElement;
    expect(leaf).toHaveTextContent("Waiting · by email · m.chen@example.com");
    expect(leaf).toHaveTextContent("returns Oct 27");
    expect(within(leaf).queryByRole("link")).toBeNull();
    await act(async () => fireEvent.click(within(leaf).getByRole("button", { name: "Revoke" })));
    expect(revoke).toHaveBeenCalledWith(R1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("counts accounts, invited and waiting, and cuts the tree to a search", () => {
    view();
    expect(screen.getByTestId("invite-tree-counts")).toHaveTextContent("3 accounts2 invited1 waiting");
    fireEvent.change(screen.getByRole("searchbox", { name: "Find an account" }), { target: { value: "col" } });
    expect(screen.getAllByRole("treeitem").map((i) => i.getAttribute("data-node") ?? "waiting")).toEqual(["u_hugh", "u_colin", "u_peter", "waiting"]);
    fireEvent.change(screen.getByRole("searchbox", { name: "Find an account" }), { target: { value: "zzz" } });
    expect(screen.queryByRole("tree")).toBeNull();
    expect(screen.getByText("No account matches “zzz”.")).toBeTruthy();
  });

  it("says so when there is no account at all, and when Clerk's names did not load", () => {
    view({ roots: [], accounts: 0, invited: 0, waiting: 0, clerk: "down" });
    expect(screen.getByText("No accounts yet.")).toBeTruthy();
    expect(screen.getByText("Names didn’t load from Clerk.")).toBeTruthy();
  });
});
