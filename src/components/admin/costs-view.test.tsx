// The Costs core's states (admin STATES C1 to C7), drawn from real summaries.
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { SettingResult } from "../../app/admin/actions";
import { describe, expect, it, vi } from "vitest";
import { costSummary, type CostRows, type DayRow } from "../../lib/admin/costs-rule";
import { usdToMicro } from "../../lib/model/spend-rule";

const setElsewhere = vi.fn(async (_input: unknown): Promise<SettingResult> => ({ ok: true }));
const setAccountCap = vi.fn(async (_input: unknown): Promise<SettingResult> => ({ ok: true }));
const setSystemCeiling = vi.fn(async (_input: unknown): Promise<SettingResult> => ({ ok: true }));
vi.mock("../../app/admin/actions", () => ({
  setElsewhere: (i: unknown) => setElsewhere(i),
  setAccountCap: (i: unknown) => setAccountCap(i),
  setSystemCeiling: (i: unknown) => setSystemCeiling(i),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/admin", useRouter: () => ({ refresh }) }));

const { CostsView } = await import("./costs-view");
const { AdminHead } = await import("./admin-head");

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-11T15:00:00Z");
const p = (day: number, v: number, runs = 1): DayRow => ({ day, origin: "player", runs, micro: usdToMicro(v) });
const sys = (day: number, v: number, runs = 1): DayRow => ({ day, origin: "system", runs, micro: usdToMicro(v) });
const rows = (days: DayRow[], over: Partial<CostRows> = {}): CostRows => ({
  days, playerAccounts: 1, ownerMicro: usdToMicro(0.884), ownerShareMicro: usdToMicro(5), previous: { runs: 19, micro: usdToMicro(0.813) }, settings: {}, paused: false, ...over,
});

function draw(r: CostRows, month = OCT) {
  return render(<CostsView s={costSummary(r, month, NOW)} month={month} current={OCT} />);
}

describe("CostsView, the current month (C1)", () => {
  it("draws the month bar, the tiles and the caps against the code's constants", () => {
    draw(rows([p(6, 0.452, 10), p(3, 0.432, 13), sys(11, 0.251, 3)]));
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(screen.getByText("1 to 11 Oct · UTC · day 11 of 31")).toBeInTheDocument();
    expect(screen.getByText("September: $0.813 in 19 runs.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute("href", "/admin?month=2026-09");
    expect(screen.queryByRole("link", { name: "Next month" })).toBeNull();

    expect(screen.getByText("Model calls").parentElement).toHaveTextContent("$1.135");
    expect(screen.getByText("Player presses").parentElement).toHaveTextContent("9% of the $10 plan");
    expect(screen.getByText("Per active account").parentElement).toHaveTextContent("1 account pressed");

    expect(screen.getByText("$0.884 of $10")).toBeInTheDocument();
    expect(screen.getAllByText("$20 hard stop").length).toBeGreaterThan(0);
    expect(screen.getByText("$0.884 of $5")).toBeInTheDocument();
    // Two IN CODE rows, two SET HERE rows.
    expect(screen.getAllByText("in code")).toHaveLength(2);
    expect(screen.getAllByText("set here")).toHaveLength(2);
    expect(screen.getByText(/Elsewhere is not entered\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter elsewhere" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("names a stored cap and an elsewhere read this month", () => {
    draw(rows([p(2, 1)], {
      settings: {
        account_cap_usd: { micro: usdToMicro(250), asOf: "2026-10-01", note: null },
        system_ceiling_usd: { micro: usdToMicro(15), asOf: "2026-10-01", note: null },
        elsewhere_usd: { micro: usdToMicro(18.4), asOf: "2026-10-09", note: "Concert Crawl and staging" },
      },
    }));
    expect(screen.getByText("$19.40 of $250")).toBeInTheDocument();
    expect(screen.getByText(/Hatched: elsewhere \$18\.40, as of Oct 9\. Note: Concert Crawl and staging/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update elsewhere" })).toBeInTheDocument();
    expect(screen.getByText("$0 of $15")).toBeInTheDocument();
  });
});

/** A cap row's drawn segments and ticks, found by its label. */
function capRow(label: string) {
  const row = screen.getByText(label).closest("div")!.parentElement!;
  return {
    row,
    segs: [...row.querySelectorAll<HTMLElement>("span.absolute.inset-y-0")],
    ticks: [...row.querySelectorAll<HTMLElement>("span.absolute.h-\\[18px\\]")],
  };
}

describe("CostsView, the owner's share", () => {
  it("draws the share the allowance enforces, not the constant", () => {
    draw(rows([p(2, 1)], { ownerShareMicro: usdToMicro(25) }));
    expect(screen.getByText("$0.884 of $25")).toBeInTheDocument();
    const { row, ticks } = capRow("Owner testing share");
    expect(ticks).toHaveLength(1);
    expect(ticks[0].style.left).toBe("100%");
    expect(row).toHaveTextContent("MODEL_OWNER_MONTHLY_USD, or OWNER_SHARE_USD in spend-rule.ts when it is unset.");
    // The bar is scaled to the share: $0.884 of $25 is 3.536% of it.
    expect(parseFloat(capRow("Owner testing share").segs[0].style.width)).toBeCloseTo(3.536, 2);
  });
});

describe("CostsView, caps not set", () => {
  it("draws the account cap's bare track, with the figure not set", () => {
    draw(rows([p(2, 1), sys(3, 0.5)]));
    expect(screen.getByText("$1.500 · not set")).toBeInTheDocument();
    const { segs, ticks } = capRow("Anthropic account cap");
    expect(segs).toEqual([]);
    expect(ticks).toEqual([]);
  });

  it("draws the system ceiling's bare track when system spend has no ceiling", () => {
    draw(rows([p(2, 1), sys(3, 0.5)]));
    expect(screen.getByText("$0.500 · not set")).toBeInTheDocument();
    const { segs, ticks } = capRow("System ceiling");
    expect(segs).toEqual([]);
    expect(ticks).toEqual([]);
  });

  it("fills the bars once the caps are set", () => {
    draw(rows([p(2, 1), sys(3, 0.5)], {
      settings: {
        account_cap_usd: { micro: usdToMicro(250), asOf: "2026-10-01", note: null },
        system_ceiling_usd: { micro: usdToMicro(15), asOf: "2026-10-01", note: null },
      },
    }));
    // The account cap counts every origin: its bar carries the system segment beside the player's.
    const inks = capRow("Anthropic account cap").segs.map((el) => el.style.background);
    expect(inks).toEqual(expect.arrayContaining(["var(--accent)", "var(--success)"]));
    expect(capRow("System ceiling").segs.map((el) => el.style.background)).toEqual(["var(--success)"]);
    expect(capRow("System ceiling").ticks).toHaveLength(1);
  });

  it("splits system spend into labels, evals and rewrites, each in its own ink", () => {
    draw(rows([p(2, 1), sys(3, 0.75)], {
      settings: {
        account_cap_usd: { micro: usdToMicro(250), asOf: "2026-10-01", note: null },
        system_ceiling_usd: { micro: usdToMicro(150), asOf: "2026-10-01", note: null },
      },
      // $0.25 of the system rows is the manual collector's labels; batches $120.95; evals $14.76.
      outside: { batchMicro: usdToMicro(120.95), evalsMicro: usdToMicro(14.76), labelCallsMicro: usdToMicro(0.25) },
    }));
    expect(screen.getByText("System").parentElement).toHaveTextContent("$136.46");
    expect(screen.getByText("$136.46 of $150")).toBeInTheDocument();
    expect(capRow("System ceiling").segs.map((el) => el.style.background)).toEqual(["var(--fact)", "var(--warning)", "var(--success)"]);
    // The account cap: the player's, then the three system inks.
    expect(screen.getByText("$137.46 of $250")).toBeInTheDocument();
    expect(capRow("Anthropic account cap").segs.map((el) => el.style.background).slice(0, 4)).toEqual(["var(--accent)", "var(--fact)", "var(--warning)", "var(--success)"]);
    // The Model calls tile stays model_calls alone.
    expect(screen.getByText("Model calls").parentElement).toHaveTextContent("$1.750");
  });
});

describe("CostsView, a ceiling that starts later", () => {
  const ceilingFrom = (asOf: string) => ({ system_ceiling_usd: { micro: usdToMicro(15), asOf, note: null } });

  it("does not apply before the month it starts, and says when it does", () => {
    draw(rows([p(2, 1), sys(3, 0.5)], { settings: ceilingFrom("2026-11-01") }));
    expect(screen.getByText("$0.500 · not set")).toBeInTheDocument();
    expect(screen.queryByText(/of \$15/)).toBeNull();
    const { row, segs, ticks } = capRow("System ceiling");
    expect(row).toHaveTextContent("Starts November.");
    expect(segs).toEqual([]);
    expect(ticks).toEqual([]);
    expect(screen.getByText("System").parentElement).toHaveTextContent("labels, evals and rewrites");
  });

  it("applies from the month it starts on", () => {
    draw(rows([p(2, 1), sys(3, 0.5)], { settings: ceilingFrom("2026-10-01") }));
    expect(screen.getByText("$0.500 of $15")).toBeInTheDocument();
    expect(capRow("System ceiling").row).toHaveTextContent("System rows in model_calls, card label batches and the eval ledgers.");
    expect(capRow("System ceiling").ticks).toHaveLength(1);
    expect(screen.getByText("System").parentElement).toHaveTextContent("3% of the $15 ceiling");
  });

  it("names the year when it starts in another one", () => {
    draw(rows([sys(3, 0.5)], { settings: ceilingFrom("2027-01-01") }));
    expect(capRow("System ceiling").row).toHaveTextContent("Starts January 2027.");
  });
});

describe("CostsView banners", () => {
  it("warns on the pace (C2)", () => {
    draw(rows([p(2, 4)]));
    expect(screen.getByRole("status")).toHaveTextContent("On this pace, player presses pass the $10 plan around 28 October.");
  });

  it("warns at 80% and inks the player tile (C5)", () => {
    draw(rows([p(2, 8.1)]));
    expect(screen.getByRole("status")).toHaveTextContent("Player presses have reached 80% of the plan.");
    expect(screen.getByText("81% of the $10 plan").className).toContain("var(--warning)");
  });

  it("says when presses are paused (C6)", () => {
    draw(rows([p(2, 19.9)], { paused: true }));
    expect(screen.getByRole("status")).toHaveTextContent("Presses are paused until November 1.");
    expect(screen.getByRole("status").getAttribute("style")).toContain("var(--danger)");
  });
});

describe("CostsView, other months", () => {
  it("draws an empty month with zeros and the empty line (C3)", () => {
    draw(rows([], { playerAccounts: 0, ownerMicro: 0 }));
    const calls = screen.getByText("Model calls").parentElement!;
    expect(within(calls).getByText("$0")).toBeInTheDocument();
    expect(within(calls).getByText("0 runs")).toBeInTheDocument();
    expect(screen.getByText("No model calls in October 2026.")).toBeInTheDocument();
    expect(screen.getByText("Per active account").parentElement).toHaveTextContent("no account pressed");
  });

  it("draws a past month to its end, with › live and no pace (C4)", () => {
    draw(rows([p(30, 4), p(1, 0.5)]), { year: 2026, month: 8 });
    expect(screen.getByText("1 to 30 Sep · UTC")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByText("on this pace")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("$4.50 by 30 Sep")).toBeInTheDocument();
  });
});

describe("Enter elsewhere (C7)", () => {
  it("opens a dialog with amount, as-of date and note, and saves through the action", async () => {
    draw(rows([p(2, 1)]));
    fireEvent.click(screen.getByRole("button", { name: "Enter elsewhere" }));
    const dialog = screen.getByRole("dialog", { name: "Enter elsewhere" });
    fireEvent.change(within(dialog).getByLabelText("Amount ($)"), { target: { value: "18.40" } });
    fireEvent.change(within(dialog).getByLabelText("As of"), { target: { value: "2026-10-09" } });
    fireEvent.change(within(dialog).getByLabelText("Note (optional)"), { target: { value: "console" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(setElsewhere).toHaveBeenCalledWith({ amount: "18.40", asOf: "2026-10-09", note: "console" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("the settings actions belong to the current month", () => {
  it("offers no setting action on a past month, whose rows they could not change", () => {
    draw(rows([p(2, 1)]), { year: 2026, month: 8 });
    for (const name of ["Change the cap", "Change the ceiling", "Enter elsewhere"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("offers all three on the current month", () => {
    draw(rows([p(2, 1)]));
    for (const name of ["Change the cap", "Change the ceiling", "Enter elsewhere"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});

describe("the account cap row", () => {
  it("shows the note saved with the cap, beside the elsewhere note", () => {
    draw(rows([p(2, 1)], { settings: {
      account_cap_usd: { micro: usdToMicro(250), asOf: "2026-10-01", note: "raised for the eval run" },
      elsewhere_usd: { micro: usdToMicro(18.4), asOf: "2026-10-09", note: "console" },
    } }));
    const sub = screen.getByText(/^Mirrors Anthropic/);
    expect(sub).toHaveTextContent("raised for the eval run");
    expect(sub).toHaveTextContent("console");
  });

  it("says who entered the elsewhere figure: you, or the account id", () => {
    const settings = { elsewhere_usd: { micro: usdToMicro(18.4), asOf: "2026-10-09", note: null, by: "user_admin" } };
    const mine = render(<CostsView s={costSummary(rows([p(2, 1)], { settings }), OCT, NOW)} month={OCT} current={OCT} viewerId="user_admin" />);
    expect(screen.getByText(/^Mirrors Anthropic/)).toHaveTextContent("as of Oct 9, entered by you.");
    mine.unmount();
    render(<CostsView s={costSummary(rows([p(2, 1)], { settings }), OCT, NOW)} month={OCT} current={OCT} viewerId="user_other" />);
    expect(screen.getByText(/^Mirrors Anthropic/)).toHaveTextContent("entered by user_admin.");
  });
});

describe("the settings dialog", () => {
  it("keeps what was typed when the save is refused", async () => {
    setAccountCap.mockResolvedValueOnce({ ok: false, error: "amount" });
    draw(rows([p(2, 1)]));
    fireEvent.click(screen.getByRole("button", { name: "Change the cap" }));
    const dialog = screen.getByRole("dialog", { name: "Change the cap" });
    fireEvent.change(within(dialog).getByLabelText("Amount ($)"), { target: { value: "12.345" } });
    fireEvent.change(within(dialog).getByLabelText("Note (optional)"), { target: { value: "console" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter dollars, like 18.40."));
    expect(setAccountCap).toHaveBeenCalledWith({ amount: "12.345", note: "console" });
    expect(within(dialog).getByLabelText("Amount ($)")).toHaveValue("12.345");
    expect(within(dialog).getByLabelText("Note (optional)")).toHaveValue("console");
  });

  it("says the outcome is unknown and refreshes when the action itself is rejected, keeping what was typed", async () => {
    setAccountCap.mockRejectedValueOnce(new Error("network"));
    draw(rows([p(2, 1)]));
    fireEvent.click(screen.getByRole("button", { name: "Change the cap" }));
    const dialog = screen.getByRole("dialog", { name: "Change the cap" });
    fireEvent.change(within(dialog).getByLabelText("Amount ($)"), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent(/may have saved/));
    expect(within(dialog).getByRole("alert")).not.toHaveTextContent(/Nothing changed/);
    expect(refresh).toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Amount ($)")).toHaveValue("100");
  });

  it("takes the month a ceiling starts, from this UTC month on", async () => {
    draw(rows([p(2, 1)]));
    fireEvent.click(screen.getByRole("button", { name: "Change the ceiling" }));
    const dialog = screen.getByRole("dialog", { name: "Change the ceiling" });
    const start = within(dialog).getByLabelText("Starts");
    const thisMonth = new Date().toISOString().slice(0, 7);
    expect(start).toHaveAttribute("type", "month");
    expect(start).toHaveValue(thisMonth);
    expect(start).toHaveAttribute("min", thisMonth);
    fireEvent.change(within(dialog).getByLabelText("Amount ($)"), { target: { value: "15" } });
    fireEvent.change(start, { target: { value: "2099-11" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(setSystemCeiling).toHaveBeenCalledWith({ amount: "15", start: "2099-11", note: "" }));
  });

  it("is 16px on a phone, so iOS does not zoom on focus", () => {
    draw(rows([p(2, 1)]));
    fireEvent.click(screen.getByRole("button", { name: "Change the cap" }));
    for (const input of within(screen.getByRole("dialog")).getAllByRole("textbox")) {
      expect(input.className).toMatch(/(^|\s)text-\[16px\](\s|$)/);
      expect(input.className).toContain("md:text-[14px]");
    }
  });
});

describe("the pinned head and month bar", () => {
  it("pins the head at the top and the month bar beneath it, at the height the head publishes", () => {
    let observed: Element | null = null;
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(private cb: () => void) {}
      observe(el: Element) { observed = el; this.cb(); }
      disconnect() { disconnect(); }
    });
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 173 } as DOMRect);
    const head = render(<AdminHead env="staging" />);
    const header = head.container.querySelector("header")!;
    expect(header.className).toMatch(/(^|\s)sticky(\s|$)/);
    expect(header.className).toMatch(/(^|\s)top-0(\s|$)/);
    expect(header.className).toContain("bg-[color:var(--bg)]");
    expect(observed).toBe(header);
    expect(document.documentElement.style.getPropertyValue("--admin-head-h")).toBe("173px");

    draw(rows([p(2, 1)]));
    const bar = screen.getByText("October 2026").closest("div.sticky")!;
    expect(bar.className).toContain("top-[var(--admin-head-h,0px)]");
    expect(bar.className).not.toMatch(/(^|\s)top-0(\s|$)/);

    head.unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--admin-head-h")).toBe("");
    rect.mockRestore();
    vi.unstubAllGlobals();
  });

  it("says the month-end projection to a screen reader in the current month, and only the total in a past one", () => {
    const now = draw(rows([p(2, 1)]));
    expect(screen.getByText("Player presses in October 2026: $1.000, on pace for $2.82 by month end.")).toBeInTheDocument();
    now.unmount();
    const SEP = { year: 2026, month: 8 };
    draw(rows([p(2, 1)]), SEP);
    expect(screen.getByText("Player presses in September 2026: $1.000.")).toBeInTheDocument();
  });

  it("re-measures the head on a window resize where ResizeObserver does not exist", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    let height = 173;
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ height }) as DOMRect);
    const head = render(<AdminHead env="staging" />);
    expect(document.documentElement.style.getPropertyValue("--admin-head-h")).toBe("173px");
    height = 201;
    window.dispatchEvent(new Event("resize"));
    expect(document.documentElement.style.getPropertyValue("--admin-head-h")).toBe("201px");
    head.unmount();
    height = 99;
    window.dispatchEvent(new Event("resize"));
    expect(document.documentElement.style.getPropertyValue("--admin-head-h")).toBe("");
    rect.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("AdminHead", () => {
  it.each([
    ["staging", "var(--warning)"],
    ["production", "var(--danger)"],
  ] as const)("names %s with its dot, titles the page and marks the Costs tab", (env, ink) => {
    render(<AdminHead env={env} />);
    const chip = screen.getByText(env);
    expect(chip.querySelector("[aria-hidden]")?.className).toContain(ink);
    expect(screen.getByRole("heading", { level: 1, name: "Costs" })).toBeInTheDocument();
    const tabs = within(screen.getByRole("navigation", { name: "Admin pages" })).getAllByRole("link");
    // Only pages that exist are listed, so no tab is a 404.
    expect(tabs.map((t) => [t.textContent, t.getAttribute("href"), t.getAttribute("aria-current")])).toEqual([["Costs", "/admin", "page"]]);
  });
});
