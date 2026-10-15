// The Accounts pages (admin STATES A1 to A7): the list's rows, search and its no-match line, Clerk
// down; the head's account mode; and an account's page: its head block, tiles, the three switch
// groups, spend by feature or `No runs in ‹Month›.`, and Change group with its confirm.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountPage } from "../../lib/admin/account-page";
import type { AccountRow } from "../../lib/admin/account-page-rule";
import type { MoveResult } from "../../lib/admin/group-writes";

let path = "/admin/accounts";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => path, useRouter: () => ({ refresh }) }));
const move = vi.fn<(userId: string, groupId: string | null, confirmed?: number) => Promise<MoveResult>>();
vi.mock("../../app/admin/accounts/actions", () => ({ moveAccountToGroup: (u: string, g: string | null, c?: number) => move(u, g, c) }));
const setOverride = vi.fn();
const clearOverride = vi.fn();
vi.mock("../../app/admin/switches/actions", () => ({ setSwitchOverride: (i: unknown) => setOverride(i), clearSwitchOverride: (i: unknown) => clearOverride(i) }));

const { AccountsList } = await import("./accounts-list");
const { AccountPageView } = await import("./account-page");
const { AdminHead } = await import("./admin-head");

const T = "11111111-1111-4111-8111-111111111111";
const F = "22222222-2222-4222-8222-222222222222";
const ROWS: AccountRow[] = [
  { id: "user_2hugh", name: "Hugh Hartigan", clerkName: "Hugh Hartigan", email: "hugh@example.com", initials: "HH", group: null, credits: "7 of 10 left", spend: "$2.10" },
  { id: "user_9mara", name: "Mara Quinn", clerkName: "Mara Quinn", email: "mara@example.com", initials: "MQ", group: { id: F, name: "friends" }, credits: "3 of 5 left", spend: "$1.420" },
];

const PAGE: AccountPage = {
  id: "user_9mara",
  name: "Mara Quinn",
  email: "mara@example.com",
  initials: "MQ",
  role: "5 credits a day.",
  tiles: [
    { key: "credits", label: "Credits now", figure: "0 of 5 left", sub: "reset at 9:05 PM UTC" },
    { key: "spent", label: "Spent in October", figure: "$1.420", sub: null },
    { key: "presses", label: "Runs", figure: "34", sub: null },
    { key: "hub", label: "Tuning hub", figure: "Drawn", sub: "2 of its tools on" },
  ],
  group: { id: F, name: "friends" },
  groups: [{ id: F, name: "friends" }, { id: T, name: "testers" }],
  switches: {
    override: [{ name: "SWAP_TOOLS_ENABLED", label: "Swap tools", on: true, source: "group friends", kill: false }],
    rule: [
      { name: "DECK_BENCHMARKS_ENABLED", label: "Deck benchmarks", on: false, source: "env var is off", kill: true },
      { name: "TUNING_ENABLED", label: "Suggested changes", on: false, source: "Analysis tab is off", kill: false },
    ],
    envOn: ["Collection edit", "Notices"],
    envOff: ["Never cut"],
    total: 6,
  },
  features: [{ feature: "synopsis", name: "Overview", presses: 12, spent: "$0.640" }],
  featureTotal: { presses: 12, spent: "$0.640" },
  month: "October",
  clerk: "ok",
  allFeatures: null,
  overridesRead: true,
};

beforeEach(() => {
  move.mockReset();
  refresh.mockReset();
});

describe("AccountsList (A1 to A3)", () => {
  it("draws a row per account linking to its page, with group, credits and spend, under the tab's sub", () => {
    render(<AccountsList rows={ROWS} clerk="ok" month="October" env="production" />);
    expect(screen.getByText("2 accounts on production. Names and emails from Clerk; the app stores only the id.")).toBeInTheDocument();
    const rows = within(screen.getByTestId("account-rows")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByRole("link")).toHaveAttribute("href", "/admin/accounts/user_9mara");
    expect(rows[1]).toHaveTextContent("mara@example.com");
    expect(rows[1]).toHaveTextContent("user_9mara");
    expect(rows[1]).toHaveTextContent("friends");
    expect(rows[1]).toHaveTextContent("3 of 5 left");
    expect(rows[0]).toHaveTextContent("No group");
    // The phone's meta line names the group as the desktop column does, `No group` included.
    expect(rows[0]).toHaveTextContent("No group · 7 of 10 left");
    expect(rows[1]).toHaveTextContent("friends · 3 of 5 left");
    expect(within(rows[0]).getByTestId("account-spend-phone")).toHaveTextContent("$2.10");
  });

  it("searches by name, email or id prefix through the shared search field, and says when nothing matches", () => {
    render(<AccountsList rows={ROWS} clerk="ok" month="October" env="staging" />);
    const search = screen.getByRole("searchbox", { name: "Name, email or Clerk id" });
    fireEvent.change(search, { target: { value: "user_9" } });
    expect(within(screen.getByTestId("account-rows")).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "9mara" } });
    expect(screen.queryByTestId("account-rows")).toBeNull();
    expect(screen.getByText("No account matches 9mara.")).toBeInTheDocument();
  });

  it("matches an account with no Clerk name by its id's start only, not the id it draws in the name's place", () => {
    const bare: AccountRow = { id: "user_7bare", name: "user_7bare", clerkName: null, email: null, initials: "U", group: null, credits: "", spend: "$0" };
    render(<AccountsList rows={[bare]} clerk="down" month="October" env="staging" />);
    const search = screen.getByRole("searchbox", { name: "Name, email or Clerk id" });
    fireEvent.change(search, { target: { value: "7bare" } });
    expect(screen.queryByTestId("account-rows")).toBeNull();
    fireEvent.change(search, { target: { value: "user_7" } });
    expect(within(screen.getByTestId("account-rows")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("says the names did not load when Clerk is down", () => {
    render(<AccountsList rows={ROWS} clerk="down" month="October" env="staging" />);
    expect(screen.getByText("Names didn’t load from Clerk.")).toBeInTheDocument();
  });
});

describe("AdminHead on the Accounts pages", () => {
  const tabs = () => within(screen.getByRole("navigation", { name: "Admin pages" })).getAllByRole("link").map((t) => [t.textContent, t.getAttribute("aria-current")]);

  it("selects Accounts, after Groups, and titles the list with no sub of its own", () => {
    path = "/admin/accounts";
    const { container } = render(<AdminHead env="staging" />);
    expect(screen.getByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(container.querySelector("header p")).toBeNull();
    expect(tabs()).toEqual([["Costs", null], ["Switches", null], ["Groups", null], ["Accounts", "page"], ["Models", null]]);
  });

  it("draws the back link and no title on an account's page, which titles itself", () => {
    path = "/admin/accounts/user_9mara";
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("link", { name: "‹ Accounts" })).toHaveAttribute("href", "/admin/accounts");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(tabs().at(-2)).toEqual(["Accounts", "page"]);
  });
});

describe("AccountPageView (A4 to A7)", () => {
  it("draws the head block, the tiles and the group", () => {
    render(<AccountPageView page={PAGE} />);
    expect(screen.getByRole("heading", { level: 1, name: "Mara Quinn" })).toBeInTheDocument();
    const head = screen.getByTestId("account-head");
    expect(head).toHaveTextContent("mara@example.com");
    expect(head).toHaveTextContent("user_9mara");
    expect(head).toHaveTextContent("5 credits a day.");
    const credits = screen.getByTestId("account-tiles").querySelector('[data-tile="credits"]')!;
    expect(credits).toHaveTextContent("0 of 5 left");
    expect(credits).toHaveTextContent("reset at 9:05 PM UTC");
    expect(within(screen.getByTestId("account-group")).getByRole("link", { name: "friends" })).toHaveAttribute("href", `/admin/groups/${F}`);
  });

  it("groups the switches, inking only the kill in danger, and lists the environment's on and off", () => {
    render(<AccountPageView page={PAGE} />);
    const box = screen.getByTestId("account-switches");
    expect(within(box).getByRole("heading", { name: /Set by an override/ })).toHaveTextContent("1");
    expect(within(box).getByRole("heading", { name: /Off by a rule/ })).toHaveTextContent("2");
    expect(within(box).getByText("env var is off").className).toContain("var(--danger)");
    expect(within(box).getByText("Analysis tab is off").className).toContain("var(--fg-muted)");
    expect(within(box).getByText("group friends").className).toContain("var(--fg-muted)");
    // Off reads muted, as the Switches list's pill does.
    const off = box.querySelector('[data-switch="TUNING_ENABLED"]')!;
    expect(within(off as HTMLElement).getByText("Off").className).toContain("var(--fg-muted)");
    expect(box.querySelector('[data-env-list="on"]')).toHaveTextContent("On · 2Collection edit, Notices");
    expect(box.querySelector('[data-env-list="off"]')).toHaveTextContent("Off · 1Never cut");
    expect(screen.queryByText(/disagree/i)).toBeNull();
  });

  // All features (2026-10-15): the override write at account scope under the reserved name. On sets it,
  // Not set clears it, and the control is absent when the overrides could not be read.
  it("turns All features on and off through the override write, at account scope", async () => {
    setOverride.mockResolvedValue({ ok: true });
    clearOverride.mockResolvedValue({ ok: true });
    const { rerender } = render(<AccountPageView page={{ ...PAGE, allFeatures: false }} />);
    const box = screen.getByTestId("account-all-features");
    await act(async () => fireEvent.click(within(box).getByRole("radio", { name: "On" })));
    expect(setOverride).toHaveBeenCalledWith({ switchName: "ALL_FEATURES", scope: "user", targetUserId: "user_9mara", value: "on" });
    rerender(<AccountPageView page={{ ...PAGE, allFeatures: true }} />);
    await act(async () => fireEvent.click(within(screen.getByTestId("account-all-features")).getByRole("radio", { name: "Not set" })));
    expect(clearOverride).toHaveBeenCalledWith({ switchName: "ALL_FEATURES", scope: "user", targetUserId: "user_9mara" });
  });

  // The head is the card's full-width bar like every group's, and the body and control sit in a row with
  // the rows' own side padding; inside the head's column the body ran flush to the card's edge.
  it("pads the All features row as the card's other rows are padded", () => {
    render(<AccountPageView page={{ ...PAGE, allFeatures: false }} />);
    const box = screen.getByTestId("account-all-features");
    const body = within(box).getByText(/./, { selector: "p" });
    expect(body.parentElement!.className).toMatch(/(^| )px-\[14px\]( |$)/);
    expect(body.parentElement!.className).toMatch(/(^| )md:px-\[16px\]( |$)/);
    expect(box.querySelector("h3")!.parentElement).toBe(box);
  });

  it("draws no All features control when the overrides did not load", () => {
    render(<AccountPageView page={PAGE} />);
    expect(screen.queryByTestId("account-all-features")).toBeNull();
  });

  it("says the overrides did not load above its sections", () => {
    render(<AccountPageView page={{ ...PAGE, overridesRead: false }} />);
    const notice = screen.getByText("Overrides didn’t load. Every row shows the env var alone.");
    expect(notice.compareDocumentPosition(screen.getByTestId("account-tiles")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws spend by feature, or No runs in the month (A6)", () => {
    const { unmount } = render(<AccountPageView page={PAGE} />);
    expect(screen.getByTestId("account-features")).toHaveTextContent("Overview");
    const total = screen.getByTestId("account-features").querySelector('[data-feature="total"]')!;
    expect(total).toHaveTextContent("Total");
    expect(total.className).toContain("var(--surface-rail)");
    unmount();
    render(<AccountPageView page={{ ...PAGE, features: [] }} />);
    expect(screen.queryByTestId("account-features")).toBeNull();
    expect(screen.getByText("No runs in October.")).toBeInTheDocument();
  });

  it("changes the group through the move action, and refreshes after it saves", async () => {
    move.mockResolvedValue({ ok: true });
    render(<AccountPageView page={PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: "Change group" }));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Move to" }), { target: { value: "" } });
    await act(async () => fireEvent.click(save));
    expect(move).toHaveBeenCalledWith("user_9mara", null, undefined);
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByTestId("account-move")).toBeNull();
  });

  it("opens the confirm on a rise and re-sends the confirmed count, and says when the move failed", async () => {
    const preview = { names: ["Mara Quinn"], count: 1, costs: [{ key: "intake" as const, reserveMicroUsd: 40_000, meanMicroUsd: null }], credits: [5], whatsNew: 0 };
    move.mockResolvedValueOnce({ ok: false, error: "confirm", preview }).mockResolvedValueOnce({ ok: false, error: "failed" });
    render(<AccountPageView page={PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: "Change group" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Move to" }), { target: { value: T } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Saving changes who is in testers");
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: /Turn on for 1/ })));
    expect(move).toHaveBeenLastCalledWith("user_9mara", T, 1);
    expect(screen.getByRole("alert")).toHaveTextContent("Didn’t save. Nothing changed.");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("on a thrown action says the move may have saved and refreshes, never that nothing changed", async () => {
    move.mockRejectedValueOnce(new Error("network"));
    render(<AccountPageView page={PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: "Change group" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Move to" }), { target: { value: T } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Lost touch with the server, so it may have saved. Check the page before saving again.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Nothing changed");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
