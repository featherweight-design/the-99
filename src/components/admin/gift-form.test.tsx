// Grant credits (admin plan A2b): picking an account, the pending bar, one action id per grant (a retry after a lost
// reply and a double press write one lot), and each refusal's words.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftResult } from "../../lib/admin/gift-rule";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const grant = vi.fn<(input: { accountId: string; units: number; note: string; actionId: string }) => Promise<GiftResult>>();
vi.mock("../../app/admin/payments/actions", () => ({ grantCredits: (i: never) => grant(i) }));

const { GiftForm } = await import("./gift-form");

const ACCOUNTS = [
  { id: "u_mara", name: "Mara K.", email: "m•••@x•••.dev" },
  { id: "u_jun", name: "Jun", email: null },
];
const pending = () => screen.queryByTestId("gift-pending");

function fill(units = "10", note = "refund for a failed run") {
  fireEvent.change(screen.getByRole("searchbox", { name: "Find an account by name" }), { target: { value: "mar" } });
  fireEvent.click(screen.getByRole("radio", { name: /Mara K\./ }));
  fireEvent.change(screen.getByRole("textbox", { name: /Credits/ }), { target: { value: units } });
  fireEvent.change(screen.getByRole("textbox", { name: /Why/ }), { target: { value: note } });
}

beforeEach(() => {
  grant.mockReset();
  refresh.mockReset();
});

describe("GiftForm", () => {
  it("lists only accounts matching the search, and draws the pending bar once account, credits and why are set", () => {
    render(<GiftForm accounts={ACCOUNTS} clerkDown={false} />);
    expect(screen.queryAllByRole("radio")).toEqual([]);
    fireEvent.change(screen.getByRole("searchbox", { name: "Find an account by name" }), { target: { value: "zz" } });
    expect(screen.getByText("No account matches.")).toBeInTheDocument();
    fill();
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("data-account"))).toEqual(["u_mara"]);
    expect(within(pending()!).getByText("Saving gives Mara K. 10 credits, spent after plan credits and before packs.")).toBeInTheDocument();
  });

  it("holds the press until the why is filled, and refuses credits out of 1 to 500 before sending", () => {
    render(<GiftForm accounts={ACCOUNTS} clerkDown={false} />);
    fill("10", "");
    expect(pending()).toBeNull();
    fill("501");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a whole number from 1 to 500.");
    expect(pending()).toBeNull();
  });

  it("sends one action id per grant: a retry after a lost reply reuses it, and the form clears once the grant lands", async () => {
    grant.mockRejectedValueOnce(new Error("lost")).mockResolvedValueOnce({ ok: true, id: "lot-1", repeated: true });
    render(<GiftForm accounts={ACCOUNTS} clerkDown={false} />);
    fill();
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Grant" })));
    expect(within(pending()!).getByRole("alert")).toHaveTextContent("Lost touch with the server, so it may have saved.");
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Grant" })));
    expect(grant).toHaveBeenCalledTimes(2);
    const [first, second] = grant.mock.calls.map(([i]) => i);
    expect(first).toEqual({ accountId: "u_mara", units: 10, note: "refund for a failed run", actionId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(second.actionId).toBe(first.actionId);
    expect(screen.getByRole("status")).toHaveTextContent("Gave Mara K. 10 credits.");
    expect(pending()).toBeNull();
  });

  it("keeps the id when the account is picked again before a retry, and takes a new one for a different grant", async () => {
    grant.mockRejectedValueOnce(new Error("lost")).mockRejectedValueOnce(new Error("lost")).mockRejectedValueOnce(new Error("lost"));
    render(<GiftForm accounts={ACCOUNTS} clerkDown={false} />);
    fill();
    const press = () => act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Grant" })));
    await press();
    fireEvent.click(screen.getByRole("radio", { name: /Mara K\./ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Credits/ }), { target: { value: "10" } });
    await press();
    fireEvent.change(screen.getByRole("textbox", { name: /Credits/ }), { target: { value: "11" } });
    await press();
    const ids = grant.mock.calls.map(([i]) => i.actionId);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it("moves through the accounts with the arrow keys, one tab stop for the group, and picks with Enter or a press", () => {
    render(<GiftForm accounts={[...ACCOUNTS, { id: "u_marco", name: "Marco", email: null }]} clerkDown={false} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Find an account by name" }), { target: { value: "mar" } });
    const [mara, marco] = screen.getAllByRole("radio");
    expect([mara.tabIndex, marco.tabIndex]).toEqual([0, -1]);
    mara.focus();
    fireEvent.keyDown(mara, { key: "ArrowDown" });
    expect(document.activeElement).toBe(marco);
    expect([mara.tabIndex, marco.tabIndex]).toEqual([-1, 0]);
    expect(marco).toHaveAttribute("aria-checked", "false");
    fireEvent.click(marco);
    expect(marco).toHaveAttribute("aria-checked", "true");
  });

  it("presses once while a grant is in flight", async () => {
    let answer: (r: GiftResult) => void = () => {};
    grant.mockReturnValueOnce(new Promise((r) => { answer = r; }));
    render(<GiftForm accounts={ACCOUNTS} clerkDown={false} />);
    fill();
    const press = within(pending()!).getByRole("button", { name: "Grant" });
    fireEvent.click(press);
    fireEvent.click(press);
    await act(async () => answer({ ok: true, id: "lot-1", repeated: false }));
    expect(grant).toHaveBeenCalledOnce();
  });

  it("words each refusal and keeps the form to correct it; a server failure says nothing changed", async () => {
    grant.mockResolvedValueOnce({ ok: false, error: "unknown" }).mockResolvedValueOnce({ ok: false, error: "failed" });
    render(<GiftForm accounts={ACCOUNTS} clerkDown={false} />);
    fill();
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Grant" })));
    expect(within(pending()!).getByRole("alert")).toHaveTextContent("This environment's Clerk does not know that account.");
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Grant" })));
    expect(within(pending()!).getByRole("alert")).toHaveTextContent("Couldn't grant the credits, so nothing changed.");
  });

  it("says when Clerk could not be read", () => {
    render(<GiftForm accounts={ACCOUNTS} clerkDown />);
    expect(screen.getByText("Clerk could not be read, so accounts show by id.")).toBeInTheDocument();
  });
});
