// The Costs core's states (admin STATES C1 to C7), drawn from real summaries.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { costSummary, type CostRows, type DayRow } from "../../lib/admin/costs-rule";
import { usdToMicro } from "../../lib/model/spend-rule";

const setElsewhere = vi.fn(async (_input: unknown) => ({ ok: true }) as const);
vi.mock("../../app/admin/actions", () => ({
  setElsewhere: (i: unknown) => setElsewhere(i),
  setAccountCap: vi.fn(async () => ({ ok: true })),
  setSystemCeiling: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

const { CostsView } = await import("./costs-view");
const { AdminHead } = await import("./admin-head");

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-11T15:00:00Z");
const p = (day: number, v: number, runs = 1): DayRow => ({ day, origin: "player", runs, micro: usdToMicro(v) });
const sys = (day: number, v: number, runs = 1): DayRow => ({ day, origin: "system", runs, micro: usdToMicro(v) });
const rows = (days: DayRow[], over: Partial<CostRows> = {}): CostRows => ({
  days, playerAccounts: 1, ownerMicro: usdToMicro(0.884), previous: { runs: 19, micro: usdToMicro(0.813) }, settings: {}, paused: false, ...over,
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
    // The account cap counts every origin: its bar carries the system segment beside the player's.
    const accountRow = screen.getByText("Anthropic account cap").closest("div")!.parentElement!;
    const inks = [...accountRow.querySelectorAll<HTMLElement>("span.absolute.inset-y-0")].map((el) => el.style.background);
    expect(inks).toEqual(expect.arrayContaining(["var(--accent)", "var(--success)"]));
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

describe("CostsView banners", () => {
  it("warns on the pace (C2)", () => {
    draw(rows([p(2, 4)]));
    expect(screen.getByRole("status")).toHaveTextContent("On this pace, player presses pass the $10 plan around 28 October.");
  });

  it("warns past 80% and inks the player tile (C5)", () => {
    draw(rows([p(2, 8.1)]));
    expect(screen.getByRole("status")).toHaveTextContent("Player presses are past 80% of the plan.");
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
