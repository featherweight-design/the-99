// Invites in the admin (plan `2026-10-16-invites.md`, PR 6; handoff Admin M2, M3): an account's Invites section
// (the field, its pending sentence and Save, an invalid draft refused, who invited it, whom it invited, Revoke on a
// waiting invite, its history) and a group's Top up invites.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountInvites } from "../../lib/admin/invites-rule";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/accounts/u_colin", useRouter: () => ({ refresh }) }));
const setInvites = vi.fn();
const topUp = vi.fn();
const revoke = vi.fn();
vi.mock("../../app/admin/invites/actions", () => ({
  setAccountInvites: (...a: unknown[]) => setInvites(...a),
  topUpGroup: (...a: unknown[]) => topUp(...a),
  revokeInvite: (...a: unknown[]) => revoke(...a),
}));

const { AccountInvitesSection, GroupTopUp } = await import("./invites-section");

const R1 = "33333333-3333-4333-8333-333333333333";
const INVITES: AccountInvites = {
  left: 2,
  waiting: 1,
  spent: 2,
  invitedBy: { kind: "account", id: "u_hugh", name: "Hugh", joinedAt: new Date("2026-10-18T09:00:00Z") },
  invited: [
    { id: "u_peter", name: "Peter", joined: "Oct 19" },
    { id: null, name: "deleted account", joined: "Oct 17" },
  ],
  waitingLines: [{ id: R1, how: "by email", email: "m.chen@example.com", sent: "Oct 20", returns: "Oct 27" }],
  history: [{ when: "20 Oct · 18:12", what: "Colin sent an invitation: 1 waiting", note: null }],
  historyCut: false,
};

beforeEach(() => {
  refresh.mockReset();
  setInvites.mockReset().mockResolvedValue({ ok: true, left: 4 });
  topUp.mockReset().mockResolvedValue({ ok: true, raised: 2 });
  revoke.mockReset().mockResolvedValue({ ok: true, changed: true });
});

const field = (name: string) => screen.getByRole("textbox", { name: new RegExp(`^${name}`) });

describe("AccountInvitesSection (M2)", () => {
  it("draws the field at what is left with its help, and no pending bar until the draft differs", () => {
    render(<AccountInvitesSection accountId="u_colin" name="Colin" invites={INVITES} />);
    expect(field("Invites left")).toHaveValue("2");
    expect(field("Invites left")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByText("How many Colin holds now. Only a new account spends one, and nothing but this field refills it.")).toBeInTheDocument();
    expect(screen.queryByTestId("account-invites-pending")).toBeNull();
    fireEvent.change(field("Invites left"), { target: { value: "4" } });
    expect(screen.getByTestId("account-invites-pending")).toHaveTextContent("Saving sets Colin’s invites from 2 to 4. The one waiting stays waiting.");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(field("Invites left")).toHaveValue("2");
    expect(screen.queryByTestId("account-invites-pending")).toBeNull();
  });

  it("saves the draft through the action and refreshes", async () => {
    render(<AccountInvitesSection accountId="u_colin" name="Colin" invites={INVITES} />);
    fireEvent.change(field("Invites left"), { target: { value: " 4" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(setInvites).toHaveBeenCalledWith("u_colin", " 4");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refuses a draft that is not a whole number from 0 to 1,000, with no Save to press", () => {
    render(<AccountInvitesSection accountId="u_colin" name="Colin" invites={INVITES} />);
    fireEvent.change(field("Invites left"), { target: { value: "1001" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a whole number from 0 to 1,000.");
    expect(field("Invites left")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(setInvites).not.toHaveBeenCalled();
  });

  it("says the outcome is unknown when the action throws, and refreshes", async () => {
    setInvites.mockRejectedValue(new Error("lost"));
    render(<AccountInvitesSection accountId="u_colin" name="Colin" invites={INVITES} />);
    fireEvent.change(field("Invites left"), { target: { value: "4" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(screen.getByRole("alert")).toHaveTextContent("may have saved");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("names the inviter, whom it invited (Open only for an account still here), and each waiting invite", () => {
    render(<AccountInvitesSection accountId="u_colin" name="Colin" invites={INVITES} />);
    expect(screen.getByTestId("account-invited-by-line")).toHaveTextContent("Invited by Hughjoined Oct 18");
    const peter = screen.getByText("Peter").closest("[data-invited]") as HTMLElement;
    expect(peter).toHaveTextContent("Invited Peterjoined Oct 19");
    expect(within(peter).getByRole("link", { name: "Open ›" })).toHaveAttribute("href", "/admin/accounts/u_peter");
    const gone = document.querySelector('[data-invited="deleted"]') as HTMLElement;
    expect(gone).toHaveTextContent("Invited deleted accountjoined Oct 17");
    expect(within(gone).queryByRole("link")).toBeNull();
    const waiting = document.querySelector(`[data-waiting="${R1}"]`) as HTMLElement;
    expect(waiting).toHaveTextContent("Waiting · by email · m.chen@example.comsent Oct 20 · returns Oct 27");
    expect(within(screen.getByTestId("account-invites-history")).getByText("Colin sent an invitation: 1 waiting")).toBeInTheDocument();
  });

  it("draws no invited-by line for a founder", () => {
    render(<AccountInvitesSection accountId="u_hugh" name="Hugh" invites={{ ...INVITES, invitedBy: { kind: "founder" } }} />);
    expect(screen.queryByTestId("account-invited-by-line")).toBeNull();
    expect(screen.queryByText(/Invited by/)).toBeNull();
  });

  it("marks the field edited, and drops how a waiting invite was sent on the phone", () => {
    render(<AccountInvitesSection accountId="u_colin" name="Colin" invites={INVITES} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("--border-strong");
    fireEvent.change(input, { target: { value: String(INVITES.left + 1) } });
    expect(input.className).toContain("--accent");
    const w = INVITES.waitingLines[0];
    expect(screen.getByText((_, el) => el?.tagName === "SPAN" && el.className.includes("md:hidden") && el.textContent === `Waiting · ${w.email}`)).toBeTruthy();
  });

  it("revokes a waiting invite through the action and refreshes", async () => {
    render(<AccountInvitesSection accountId="u_colin" name="Colin" invites={INVITES} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Revoke" })));
    expect(revoke).toHaveBeenCalledWith(R1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("GroupTopUp (M3)", () => {
  const members = [
    { id: "c", name: "Colin", left: 2 },
    { id: "x", name: "Chris", left: 3 },
    { id: "m", name: "Max", left: 0 },
  ];
  const G = "11111111-1111-4111-8111-111111111111";

  it("names who rises and who already holds that many, tops up through the action, and clears the field", async () => {
    render(<GroupTopUp groupId={G} members={members} />);
    expect(screen.getByText(/^Raises every member holding fewer to this many\./)).toBeInTheDocument();
    fireEvent.change(field("Top up each member to"), { target: { value: "3" } });
    expect(screen.getByTestId("group-top-up-pending")).toHaveTextContent("Topping up raises 2 of 3 members to 3 invites left: Colin (2), Max (0). 1 already holds 3.");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Top up" })));
    expect(topUp).toHaveBeenCalledWith(G, "3");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(field("Top up each member to")).toHaveValue("");
    expect(screen.queryByTestId("group-top-up-pending")).toBeNull();
  });

  it("says when nobody would rise and leaves Top up unpressable; refuses a bad number", () => {
    render(<GroupTopUp groupId={G} members={members} />);
    fireEvent.change(field("Top up each member to"), { target: { value: "0" } });
    expect(screen.getByTestId("group-top-up-pending")).toHaveTextContent("Nobody holds fewer than 0: topping up changes nothing.");
    expect(screen.getByRole("button", { name: "Top up" })).toBeDisabled();
    fireEvent.change(field("Top up each member to"), { target: { value: "two" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a whole number from 0 to 1,000.");
    expect(screen.queryByRole("button", { name: "Top up" })).toBeNull();
  });
});
