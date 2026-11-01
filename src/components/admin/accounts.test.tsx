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
const revealFn = vi.fn<(id: string) => Promise<import("../../lib/admin/reveal").RevealResult>>();
vi.mock("../../app/admin/accounts/actions", () => ({
  moveAccountToGroup: (u: string, g: string | null, c?: number) => move(u, g, c),
  revealAccount: (id: string) => revealFn(id),
  lookUpAccount: (email: string) => lookUpFn(email),
}));
const lookUpFn = vi.fn<(email: string) => Promise<import("../../lib/admin/lookup").LookUpResult>>();
const setOverride = vi.fn();
const clearOverride = vi.fn();
vi.mock("../../app/admin/switches/actions", () => ({ setSwitchOverride: (i: unknown) => setOverride(i), clearSwitchOverride: (i: unknown) => clearOverride(i) }));

const { AccountsList } = await import("./accounts-list");
const { AccountPageView } = await import("./account-page");
const { AdminHead } = await import("./admin-head");

/** A reveal's hide time as the server stamps it: five minutes on. */
const SOON = new Date(Date.now() + 5 * 60_000);
const T = "11111111-1111-4111-8111-111111111111";
const F = "22222222-2222-4222-8222-222222222222";
const ROWS: AccountRow[] = [
  { id: "user_2hugh", name: "Hugh H.", email: "h•••@e•••.com", owner: true, initials: null, group: null, credits: "7 of 10", spend: "$2.10", invites: { left: 0, waiting: 0, invitedBy: { kind: "founder" } } },
  { id: "user_9mara", name: "Mara Q.", email: "m•••@e•••.com", owner: false, initials: "MQ", group: { id: F, name: "friends" }, credits: "3 of 5", spend: "$1.420", invites: { left: 2, waiting: 1, invitedBy: { kind: "account", id: "user_2hugh", name: "Hugh H.", joinedAt: new Date(0) } } },
  { id: "user_4theo", name: "Theo", email: null, owner: false, initials: "TH", group: null, credits: "5 of 5", spend: "$0", invites: { left: 3, waiting: 0, invitedBy: { kind: "deleted", joinedAt: new Date(0) } } },
];

const PAGE: AccountPage = {
  id: "user_9mara",
  name: "Mara Q.",
  email: "m•••@e•••.com",
  initials: "MQ",
  canShow: true,
  role: "5 credits a day.",
  tiles: [
    { key: "credits", label: "Credits now", figure: "0 of 5 left", sub: "reset at 9:05 PM UTC" },
    { key: "spent", label: "Spent in October", figure: "$1.420", sub: null },
    { key: "presses", label: "Runs", figure: "34", sub: null },
    { key: "hub", label: "Tuning hub", figure: "Drawn", sub: "2 of its tools on" },
    { key: "invites", label: "Invites", figure: "2", sub: "0 waiting · 0 spent" },
  ],
  group: { id: F, name: "friends" },
  groups: [{ id: F, name: "friends" }, { id: T, name: "testers" }],
  switches: {
    override: [{ name: "SWAP_TOOLS_ENABLED", label: "Swap tools", on: true, source: "group friends", kill: false }],
    rule: [
      { name: "FLYER_TRIAL_ENABLED", label: "Flyer trial", on: false, source: "env var is off", kill: true },
      { name: "TUNING_ENABLED", label: "Suggested changes", on: false, source: "Analysis tab is off", kill: false },
    ],
    envOn: ["Announcements", "Feedback"],
    envOff: ["Buying credits"],
    total: 6,
  },
  features: [{ feature: "synopsis", name: "Overview", presses: 12, spent: "$0.640" }],
  featureTotal: { presses: 12, spent: "$0.640" },
  invites: { left: 2, waiting: 0, spent: 0, invitedBy: { kind: "founder" }, invitedByFace: null, invited: [], waitingLines: [], history: [], historyCut: false },
  month: "October",
  clerk: "ok",
  allFeatures: null,
  overridesRead: true,
};

beforeEach(() => {
  revealFn.mockReset();
  lookUpFn.mockReset();
  move.mockReset();
  refresh.mockReset();
});

describe("AccountsList (A1 to A3)", () => {
  it("draws a row per account linking to its page, with group, credits and spend, under the tab's sub", () => {
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="production" />);
    expect(screen.getByText("3 accounts on production. Names and emails are masked; Show reveals one account and logs it.")).toBeInTheDocument();
    const rows = within(screen.getByTestId("account-rows")).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole("link")).toHaveAttribute("href", "/admin/accounts/user_9mara");
    expect(rows[1]).toHaveTextContent("m•••@e•••.com");
    // D3: the Clerk id is the link, never drawn.
    expect(rows[1]).not.toHaveTextContent("user_9mara");
    expect(rows[1]).toHaveTextContent("friends");
    expect(rows[1]).toHaveTextContent("3 of 5");
    // Under the `Credits now` head the row says `3 of 5`, not `3 of 5 left` (R3, A1).
    expect(rows[1]).not.toHaveTextContent("3 of 5 left");
    expect(rows[0]).toHaveTextContent("No group");
    // The phone's meta line names the group as the desktop column does, `No group` included.
    expect(rows[0]).toHaveTextContent("No group · 7 of 10");
    expect(rows[1]).toHaveTextContent("friends · 3 of 5");
    expect(within(rows[0]).getByTestId("account-spend-phone")).toHaveTextContent("$2.10");
  });

  it("draws Invites (with what is waiting) and Invited by (M1), and the same on the phone's meta line", () => {
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="production" />);
    const [hugh, mara, theo] = within(screen.getByTestId("account-rows")).getAllByRole("listitem");
    // The column cells, each with its sr-only label; a 0 with nothing waiting and a founder are faint.
    expect(within(hugh).getByTestId("account-invites-cell")).toHaveTextContent(/^Invites 0$/);
    expect(within(hugh).getByTestId("account-invites-cell").className).toContain("--fg-faint");
    expect(within(hugh).getByTestId("account-invited-by")).toHaveTextContent(/^Invited by founder$/);
    expect(within(hugh).getByTestId("account-invited-by").className).toContain("--fg-faint");
    expect(within(mara).getByTestId("account-invites-cell")).toHaveTextContent(/^Invites 2 · 1 waiting$/);
    expect(within(mara).getByTestId("account-invites-cell").className).not.toContain("--fg-faint");
    expect(within(mara).getByTestId("account-invited-by")).toHaveTextContent(/^Invited by Hugh H.$/);
    expect(within(theo).getByTestId("account-invited-by")).toHaveTextContent(/^Invited by deleted account$/);
    expect(hugh).toHaveTextContent("No group · 7 of 10 · 0 invites · founder");
    expect(mara).toHaveTextContent("friends · 3 of 5 · 2 · 1 waiting · by Hugh H.");
    expect(theo).toHaveTextContent("No group · 5 of 5 · 3 invites · by deleted account");
    expect(screen.getAllByText("Invited by", { selector: "[aria-hidden] span" })).toHaveLength(1);
  });

  it("searches the masked name through the shared search field, and says when nothing matches", () => {
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="staging" />);
    const search = screen.getByRole("searchbox", { name: "Name, or a whole email" });
    fireEvent.change(search, { target: { value: "ara q" } });
    expect(within(screen.getByTestId("account-rows")).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "zed" } });
    expect(screen.queryByTestId("account-rows")).toBeNull();
    expect(screen.getByText("No account matches zed.")).toBeInTheDocument();
  });

  it("never matches an email or a Clerk id, which the client does not hold whole", () => {
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="staging" />);
    const search = screen.getByRole("searchbox", { name: "Name, or a whole email" });
    for (const q of ["example.com", "user_9", "9mara"]) {
      fireEvent.change(search, { target: { value: q } });
      expect(screen.queryByTestId("account-rows")).toBeNull();
    }
    // With an `@` it filters nothing: the address waits for Enter and the server's exact lookup (A8).
    fireEvent.change(search, { target: { value: "mara@" } });
    expect(within(screen.getByTestId("account-rows")).getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks the owner and an account with no name with the diamond, and tags the owner (D4)", () => {
    const bare: AccountRow = { ...ROWS[2], id: "user_7bare", name: "Account ·bare", initials: null };
    render(<AccountsList viewerId="user_2hugh" rows={[...ROWS, bare]} clerk="ok" month="October" env="staging" />);
    const rows = within(screen.getByTestId("account-rows")).getAllByRole("listitem");
    const marked = (row: HTMLElement) => row.querySelector('[data-mark="diamond"]') !== null;
    expect(rows.map(marked)).toEqual([true, false, false, true]);
    expect(rows[0]).toHaveTextContent("owner");
    expect(rows[1]).not.toHaveTextContent("owner");
    expect(rows[1]).toHaveTextContent("MQ");
  });

  it("matches an account with no name by its Account ·<tail>, never by its id's start", () => {
    const bare: AccountRow = { id: "user_7bare", name: "Account ·bare", email: null, owner: false, initials: null, group: null, credits: "", spend: "$0", invites: { left: 0, waiting: 0, invitedBy: { kind: "founder" } } };
    render(<AccountsList viewerId="user_2hugh" rows={[bare]} clerk="down" month="October" env="staging" />);
    const search = screen.getByRole("searchbox", { name: "Name, or a whole email" });
    fireEvent.change(search, { target: { value: "user_7" } });
    expect(screen.queryByTestId("account-rows")).toBeNull();
    fireEvent.change(search, { target: { value: "·bare" } });
    expect(within(screen.getByTestId("account-rows")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("offers Show on every row but the owner's and the viewer's own (A1)", () => {
    render(<AccountsList viewerId="user_4theo" rows={ROWS} clerk="ok" month="October" env="production" />);
    const [hugh, mara, theo] = within(screen.getByTestId("account-rows")).getAllByRole("listitem");
    expect(within(hugh).queryByRole("button", { name: /Show/ })).toBeNull();
    expect(within(theo).queryByRole("button", { name: /Show/ })).toBeNull();
    const show = within(mara).getByRole("button", { name: /Show/ });
    // Show sits beside the link, never inside it (D5).
    expect(show.closest("a")).toBeNull();
    expect(show).toHaveAttribute("aria-pressed", "false");
  });

  it("reveals one row on Show, with its id and the hide time, and masks it again on Hide (A2, D6)", async () => {
    revealFn.mockResolvedValue({ ok: true, id: "user_9mara", name: "Mara Quinn", email: "mara@example.com", hidesAt: SOON.toISOString() });
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="production" />);
    const mara = () => within(screen.getByTestId("account-rows")).getAllByRole("listitem")[1];
    await act(async () => fireEvent.click(within(mara()).getByRole("button", { name: /Show/ })));
    expect(revealFn).toHaveBeenCalledWith("user_9mara");
    expect(mara()).toHaveAttribute("data-revealed");
    expect(mara()).toHaveTextContent("Mara Quinn");
    expect(mara()).toHaveTextContent("mara@example.com");
    expect(mara()).toHaveTextContent("user_9mara");
    expect(mara()).toHaveTextContent(`Shown and logged · hides at ${String(SOON.getUTCHours()).padStart(2, "0")}:${String(SOON.getUTCMinutes()).padStart(2, "0")} UTC`);
    // Only the row asked for: Theo stays masked.
    expect(within(screen.getByTestId("account-rows")).getAllByRole("listitem")[2]).not.toHaveAttribute("data-revealed");
    fireEvent.click(within(mara()).getByRole("button", { name: /Hide/ }));
    expect(mara()).not.toHaveAttribute("data-revealed");
    expect(mara()).not.toHaveTextContent("mara@example.com");
    expect(mara()).toHaveTextContent("m•••@e•••.com");
  });

  it("says a failed Show showed nothing, by the masked name, and Try again asks again (D13)", async () => {
    revealFn.mockResolvedValue({ ok: false, error: "failed" });
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="production" />);
    const mara = within(screen.getByTestId("account-rows")).getAllByRole("listitem")[1];
    await act(async () => fireEvent.click(within(mara).getByRole("button", { name: /Show/ })));
    expect(screen.getByRole("alert")).toHaveTextContent(/^Couldn’t show Mara Q\. Nothing was shown\./);
    expect(mara).not.toHaveAttribute("data-revealed");
    await act(async () => fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Try again" })));
    expect(revealFn).toHaveBeenCalledTimes(2);
  });

  it("closes the failed-Show toast on its own once its window runs out", async () => {
    revealFn.mockResolvedValue({ ok: false, error: "failed" });
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="production" />);
    vi.useFakeTimers();
    try {
      const mara = within(screen.getByTestId("account-rows")).getAllByRole("listitem")[1];
      await act(async () => fireEvent.click(within(mara).getByRole("button", { name: /Show/ })));
      expect(screen.getByRole("alert")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(30_000));
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  describe("the one field: a name, or a whole email (D10 to D13)", () => {
    const field = () => screen.getByRole("searchbox", { name: "Name, or a whole email" });
    const rowsShown = () => (screen.queryByTestId("account-rows") ? within(screen.getByTestId("account-rows")).getAllByRole("listitem") : []);
    const list = () => render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="ok" month="October" env="production" />);

    it("filters the masked names as you type without an @ (A7), and asks nothing", () => {
      list();
      fireEvent.change(field(), { target: { value: "mara" } });
      expect(rowsShown()).toHaveLength(1);
      fireEvent.change(field(), { target: { value: "zed" } });
      expect(screen.getByText("No account matches zed.")).toBeInTheDocument();
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(lookUpFn).not.toHaveBeenCalled();
    });

    it("leaves the list whole while an address waits for Enter (A8)", () => {
      list();
      fireEvent.change(field(), { target: { value: "mara@example.com" } });
      expect(rowsShown()).toHaveLength(3);
      expect(screen.getByText("Press Enter to look up this exact email.")).toBeInTheDocument();
      expect(lookUpFn).not.toHaveBeenCalled();
    });

    it("looks up once on Enter, and a hit shows its one row, masked, with its Show (A3)", async () => {
      lookUpFn.mockResolvedValue({ kind: "hit", id: "user_9mara" });
      list();
      fireEvent.change(field(), { target: { value: "Mara@Example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(lookUpFn).toHaveBeenCalledTimes(1);
      expect(lookUpFn).toHaveBeenCalledWith("Mara@Example.com");
      expect(screen.getByText("One account holds this email.")).toBeInTheDocument();
      const rows = rowsShown();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent("m•••@e•••.com");
      expect(within(rows[0]).getByRole("button", { name: /Show/ })).toBeInTheDocument();
      // Typing on drops the answer: the list is whole again and waits for Enter.
      fireEvent.change(field(), { target: { value: "Mara@Example.co" } });
      expect(rowsShown()).toHaveLength(3);
    });

    it("draws no rows and no column head on a miss (A4)", async () => {
      lookUpFn.mockResolvedValue({ kind: "miss" });
      list();
      fireEvent.change(field(), { target: { value: "nobody@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(screen.getByText("No account holds this email.")).toBeInTheDocument();
      expect(screen.queryByTestId("account-rows")).toBeNull();
      expect(screen.queryByText("Account")).toBeNull();
    });

    it("keeps the field and the whole list on a failure, and raises the toast with Try again (A5)", async () => {
      lookUpFn.mockResolvedValueOnce({ kind: "failed" }).mockResolvedValueOnce({ kind: "hit", id: "user_9mara" });
      list();
      fireEvent.change(field(), { target: { value: "mara@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(field()).toHaveValue("mara@example.com");
      expect(rowsShown()).toHaveLength(3);
      expect(screen.getByText("Press Enter to look up this exact email.")).toBeInTheDocument();
      const toast = screen.getByRole("alert");
      expect(toast).toHaveTextContent("Couldn’t look up that email.");
      await act(async () => fireEvent.click(within(toast).getByRole("button", { name: "Try again" })));
      expect(lookUpFn).toHaveBeenCalledTimes(2);
      expect(rowsShown()).toHaveLength(1);
    });

    it("asks again when the same address is retyped, rather than restoring the old answer", async () => {
      lookUpFn.mockResolvedValue({ kind: "miss" });
      list();
      fireEvent.change(field(), { target: { value: "nobody@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(screen.getByText("No account holds this email.")).toBeInTheDocument();
      fireEvent.change(field(), { target: { value: "" } });
      fireEvent.change(field(), { target: { value: "nobody@example.com" } });
      expect(screen.queryByText("No account holds this email.")).toBeNull();
      expect(screen.getByText("Press Enter to look up this exact email.")).toBeInTheDocument();
      expect(rowsShown()).toHaveLength(3);
    });

    it("drops the old answer when a new lookup fails, and the whole list comes back with the hint", async () => {
      lookUpFn.mockResolvedValueOnce({ kind: "hit", id: "user_9mara" }).mockResolvedValueOnce({ kind: "failed" });
      list();
      fireEvent.change(field(), { target: { value: "mara@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(rowsShown()).toHaveLength(1);
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(rowsShown()).toHaveLength(3);
      expect(screen.getByText("Press Enter to look up this exact email.")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t look up that email.");
    });

    it("drops an answer for an address edited away while it was asked", async () => {
      let answer!: (r: import("../../lib/admin/lookup").LookUpResult) => void;
      lookUpFn.mockImplementationOnce(() => new Promise((r) => (answer = r)));
      list();
      fireEvent.change(field(), { target: { value: "mara@example.com" } });
      fireEvent.keyDown(field(), { key: "Enter" });
      fireEvent.change(field(), { target: { value: "theo@example.com" } });
      await act(async () => answer({ kind: "failed" }));
      expect(screen.queryByRole("alert")).toBeNull();
      expect(rowsShown()).toHaveLength(3);
    });

    it("reads the list again for a hit the page does not hold, and draws no empty card meanwhile", async () => {
      lookUpFn.mockResolvedValue({ kind: "hit", id: "user_new" });
      list();
      fireEvent.change(field(), { target: { value: "new@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(screen.getByText("One account holds this email.")).toBeInTheDocument();
      expect(screen.queryByTestId("account-card")).toBeNull();
    });

    it("draws one failure toast at a time: a failed lookup after a failed Show replaces it", async () => {
      revealFn.mockResolvedValue({ ok: false, error: "failed" });
      lookUpFn.mockResolvedValue({ kind: "failed" });
      list();
      const mara = within(screen.getByTestId("account-rows")).getAllByRole("listitem")[1];
      await act(async () => fireEvent.click(within(mara).getByRole("button", { name: /Show/ })));
      expect(screen.getByRole("alert")).toHaveTextContent("Nothing was shown.");
      fireEvent.change(field(), { target: { value: "mara@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(screen.getAllByRole("alert")).toHaveLength(1);
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t look up that email.");
      // Clearing the newer leaves none: the failed Show it replaced is gone for good.
      fireEvent.change(field(), { target: { value: "" } });
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("draws one failure toast at a time the other way round: a failed Show after a failed lookup replaces it", async () => {
      revealFn.mockResolvedValue({ ok: false, error: "failed" });
      lookUpFn.mockResolvedValue({ kind: "failed" });
      list();
      fireEvent.change(field(), { target: { value: "mara@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t look up that email.");
      // The whole list stays on a failed lookup, so Mara's Show is there to press.
      const mara = within(screen.getByTestId("account-rows")).getAllByRole("listitem")[1];
      await act(async () => fireEvent.click(within(mara).getByRole("button", { name: /Show/ })));
      expect(screen.getAllByRole("alert")).toHaveLength(1);
      expect(screen.getByRole("alert")).toHaveTextContent("Nothing was shown.");
      // Its Try again asks again, and a toast it leaves behind is not the lookup's.
      revealFn.mockResolvedValue({ ok: true, id: "user_9mara", name: "Mara Quinn", email: "mara@example.com", hidesAt: SOON.toISOString() });
      await act(async () => fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Try again" })));
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("brings the whole list back on ✕", async () => {
      lookUpFn.mockResolvedValue({ kind: "miss" });
      list();
      fireEvent.change(field(), { target: { value: "nobody@example.com" } });
      await act(async () => fireEvent.keyDown(field(), { key: "Enter" }));
      fireEvent.click(screen.getByRole("button", { name: /clear/i }));
      expect(field()).toHaveValue("");
      expect(rowsShown()).toHaveLength(3);
    });
  });

  it("says the names did not load when Clerk is down", () => {
    render(<AccountsList viewerId="user_2hugh" rows={ROWS} clerk="down" month="October" env="staging" />);
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
    expect(tabs()).toEqual([["Costs", null], ["Switches", null], ["Groups", null], ["Accounts", "page"], ["Models", null], ["Invites", null], ["Payments", null]]);
  });

  it("draws the back link and no title on an account's page, which titles itself", () => {
    path = "/admin/accounts/user_9mara";
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("link", { name: "‹ Accounts" })).toHaveAttribute("href", "/admin/accounts");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(tabs().at(-4)).toEqual(["Accounts", "page"]);
  });
});

describe("AccountPageView (A4 to A7)", () => {
  it("draws the head block, the tiles and the group", () => {
    render(<AccountPageView page={PAGE} />);
    expect(screen.getByRole("heading", { level: 1, name: "Mara Q." })).toBeInTheDocument();
    const head = screen.getByTestId("account-head");
    expect(head).toHaveTextContent("m•••@e•••.com");
    expect(head).not.toHaveTextContent("user_9mara");
    expect(head).toHaveTextContent("5 credits a day.");
    const credits = screen.getByTestId("account-tiles").querySelector('[data-tile="credits"]')!;
    expect(credits).toHaveTextContent("0 of 5 left");
    expect(credits).toHaveTextContent("reset at 9:05 PM UTC");
    expect(within(screen.getByTestId("account-group")).getByRole("link", { name: "friends" })).toHaveAttribute("href", `/admin/groups/${F}`);
  });

  it("reveals the head on Show: full name, email, the id under it and the hide time; Hide masks it again (B2)", async () => {
    revealFn.mockResolvedValue({ ok: true, id: "user_9mara", name: "Mara Quinn", email: "mara@example.com", hidesAt: SOON.toISOString() });
    render(<AccountPageView page={PAGE} />);
    // One Show for each width (the head's right from md, under the head on the phone), the same control.
    const shows = screen.getAllByRole("button", { name: "Show Mara Q." });
    expect(shows).toHaveLength(2);
    await act(async () => fireEvent.click(shows[0]));
    expect(revealFn).toHaveBeenCalledWith("user_9mara");
    // The page refreshes so History draws the Show's log line at once (D8).
    expect(refresh).toHaveBeenCalledTimes(1);
    const head = screen.getByTestId("account-head");
    expect(head).toHaveAttribute("data-revealed");
    expect(screen.getByRole("heading", { level: 1, name: "Mara Quinn" })).toBeInTheDocument();
    expect(head).toHaveTextContent("mara@example.com");
    expect(head).toHaveTextContent("user_9mara");
    expect(head).toHaveTextContent(`Shown and logged · hides at ${String(SOON.getUTCHours()).padStart(2, "0")}:${String(SOON.getUTCMinutes()).padStart(2, "0")} UTC`);
    // The invites field help names the full name while revealed, and only then.
    expect(screen.getByTestId("account-invites")).toHaveTextContent("Mara Quinn");
    fireEvent.click(screen.getAllByRole("button", { name: "Hide Mara Q." })[1]);
    expect(head).not.toHaveAttribute("data-revealed");
    expect(head).not.toHaveTextContent("mara@example.com");
    expect(screen.getByTestId("account-invites")).not.toHaveTextContent("Mara Quinn");
  });

  it("marks a Show's log line in History with the accent diamond, and no other line (D8)", () => {
    const history = [
      { when: "Oct 17 · 19:37", what: "You showed Mara Q.’s name and email", note: null, reveal: true as const },
      { when: "Oct 12 · 17:31", what: "You set Mara Q.’s invites: 1 → 2", note: null },
    ];
    render(<AccountPageView page={{ ...PAGE, invites: { ...PAGE.invites, history } }} />);
    const [shown, set] = within(screen.getByTestId("account-invites-history")).getAllByRole("listitem");
    expect(shown.querySelector("[data-reveal-mark]")).not.toBeNull();
    expect(set.querySelector("[data-reveal-mark]")).toBeNull();
  });

  it("draws no Show on the owner's or the viewer's own page", () => {
    render(<AccountPageView page={{ ...PAGE, canShow: false }} />);
    expect(screen.queryByRole("button", { name: /^Show / })).toBeNull();
  });

  it("draws the Invites tile fifth and the Invites section after the tiles, before the group (M2)", () => {
    render(<AccountPageView page={PAGE} />);
    const tiles = screen.getByTestId("account-tiles");
    expect([...tiles.querySelectorAll("[data-tile]")].map((t) => t.getAttribute("data-tile"))).toEqual(["credits", "spent", "presses", "hub", "invites"]);
    expect(tiles.className).toContain("xl:grid-cols-5");
    const section = screen.getByTestId("account-invites");
    expect(within(section).getByRole("textbox", { name: /^Invites left/ })).toHaveValue("2");
    expect(tiles.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(section.compareDocumentPosition(screen.getByTestId("account-group")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(box.querySelector('[data-env-list="on"]')).toHaveTextContent("On · 2Announcements, Feedback");
    expect(box.querySelector('[data-env-list="off"]')).toHaveTextContent("Off · 1Buying credits");
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
    const preview = { names: ["Mara Q."], count: 1, costs: [{ key: "intake" as const, reserveMicroUsd: 40_000, meanMicroUsd: null }], credits: [5], whatsNew: 0 };
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
