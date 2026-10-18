// The Costs core's states (admin STATES C1 to C7), drawn from real summaries.
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { SettingResult } from "../../app/admin/actions";
import { describe, expect, it, vi } from "vitest";
import { costSummary, type CostRows, type DayRow } from "../../lib/admin/costs-rule";
import { usdToMicro } from "../../lib/model/spend-rule";

const setOrgCap = vi.fn(async (_input: unknown): Promise<SettingResult> => ({ ok: true }));
const setAccountCap = vi.fn(async (_input: unknown): Promise<SettingResult> => ({ ok: true }));
const setSystemCeiling = vi.fn(async (_input: unknown): Promise<SettingResult> => ({ ok: true }));
vi.mock("../../app/admin/actions", () => ({
  setOrgCap: (i: unknown) => setOrgCap(i),
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
  days, playerAccounts: 1, ownerMicro: usdToMicro(0.884), ownerShareMicro: usdToMicro(5), previous: { runs: 19, micro: usdToMicro(0.813) }, settings: {}, anthropic: { ok: false, kind: "no_key" }, ...over,
});
type Keys = Extract<CostRows["anthropic"], { ok: true }>["keys"];
const PROD_KEY = { name: "Production app", hint: "sk-ant-api03-R2D...igAA", status: "active", statusWord: "active" } as const;
/** Anthropic's bill for The 99 and the org's other workspaces, read at 14:55 UTC on the day `NOW` falls on. */
const billed = (v: number, other = 40, keys: Keys = { ok: true, rows: [PROD_KEY] }): Pick<CostRows, "anthropic"> => ({
  anthropic: { ok: true, asOf: "2026-10-11T14:55:00.000Z", workspaceMicro: usdToMicro(v), otherMicro: usdToMicro(other), orgMicro: usdToMicro(v + other), keys },
});
const HATCH = "repeating-linear-gradient(135deg, var(--fg-faint) 0 3px, transparent 3px 6px)";

function draw(r: CostRows, month = OCT) {
  return render(<CostsView s={costSummary(r, month, NOW)} names={{}} month={month} current={OCT} now={NOW} />);
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
    // No plan to be a share of since 2026-10-17: the tile says its runs and pace, as Model calls does.
    expect(screen.getByText("Player runs").parentElement).toHaveTextContent("23 runs · on pace for");
    expect(screen.getByText("Player runs").parentElement).not.toHaveTextContent("plan");
    expect(screen.getByText("Per active account").parentElement).toHaveTextContent("1 account with runs");

    expect(screen.queryByText("$0.884 of $10")).toBeNull();
    expect(screen.queryByText(/hard stop|plan/)).toBeNull();
    expect(screen.getByText("$0.884 of $5")).toBeInTheDocument();
    // One row from code, one from this page and two from Anthropic; the source label sits LEFT of the row's name.
    for (const [source, n] of [["in code", 1], ["recorded here", 1], ["from Anthropic", 2]] as const) {
      const tags = screen.getAllByText(source);
      expect(tags).toHaveLength(n);
      for (const tag of tags) expect(tag.previousElementSibling).toBeNull();
    }
    // No key here: the workspace row is this environment's ledger alone, and says why.
    expect(screen.getByText("$1.135 here · workspace not read")).toBeInTheDocument();
    expect(screen.getByText("ANTHROPIC_ADMIN_KEY is not set here, so the workspace is not read.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /elsewhere/i })).toBeNull();
    // The org row is read with the workspace, so it is not read either, and says so without repeating the reason.
    expect(screen.getAllByText(/ANTHROPIC_ADMIN_KEY is not set/)).toHaveLength(1);
    expect(capRow("Anthropic org cap").row).toHaveTextContent("not read");
    expect(screen.getByText("The key list was not read.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("reads the workspace from Anthropic against the cap, elsewhere hatched last", () => {
    draw(rows([p(2, 1)], {
      ...billed(19.4),
      settings: {
        account_cap_usd: { micro: usdToMicro(150), asOf: "2026-10-01", note: null },
        system_ceiling_usd: { micro: usdToMicro(15), asOf: "2026-10-01", note: null },
        // A retired elsewhere row never reaches the summary: `loadCosts` drops it (`isSettingKey`).
        ...({ elsewhere_usd: { micro: usdToMicro(99), asOf: "2026-10-09", note: "stale" } } as object),
      },
    }));
    expect(screen.getByText("$19.40 of $150")).toBeInTheDocument();
    const { row, segs, ticks } = capRow("The 99 workspace cap");
    expect(row).toHaveTextContent("from Anthropic");
    expect(row).toHaveTextContent(
      "Mirrors Anthropic’s console. This environment’s ledger, then elsewhere hatched. Elsewhere $18.40: the other environment and anything else on this workspace. Read from Anthropic at 14:55 UTC, about five minutes behind.",
    );
    expect(row).not.toHaveTextContent("stale");
    expect(segs.map((el) => el.style.background)).toEqual(["var(--accent)", HATCH]);
    expect(ticks).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /elsewhere/i })).toBeNull();
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
  it("draws the workspace cap's bare track, with the figure not set", () => {
    draw(rows([p(2, 1), sys(3, 0.5)], billed(12)));
    expect(screen.getByText("$12.00 · not set")).toBeInTheDocument();
    const { segs, ticks } = capRow("The 99 workspace cap");
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
      ...billed(3),
      settings: {
        account_cap_usd: { micro: usdToMicro(250), asOf: "2026-10-01", note: null },
        system_ceiling_usd: { micro: usdToMicro(15), asOf: "2026-10-01", note: null },
      },
    }));
    // The account cap counts every origin: its bar carries the system segment beside the player's.
    const inks = capRow("The 99 workspace cap").segs.map((el) => el.style.background);
    expect(inks).toEqual(["var(--accent)", "var(--success)", HATCH]);
    expect(capRow("System ceiling").segs.map((el) => el.style.background)).toEqual(["var(--success)"]);
    expect(capRow("System ceiling").ticks).toHaveLength(1);
  });

  it("splits system spend into labels and rewrites, each in its own ink, and leaves the evals out", () => {
    draw(rows([p(2, 1), sys(3, 0.75)], {
      ...billed(130),
      settings: {
        account_cap_usd: { micro: usdToMicro(250), asOf: "2026-10-01", note: null },
        system_ceiling_usd: { micro: usdToMicro(150), asOf: "2026-10-01", note: null },
      },
      // $0.25 of the system rows is the manual collector's labels; batches $120.95; evals $14.76.
      outside: { batchMicro: usdToMicro(120.95), evalsMicro: usdToMicro(14.76), labelCallsMicro: usdToMicro(0.25) },
    }));
    expect(screen.getByText("System").parentElement).toHaveTextContent("$121.70");
    expect(screen.getByText("System").parentElement).toHaveTextContent("81% of the $150 ceiling");
    expect(screen.getByText("$121.70 of $150")).toBeInTheDocument();
    expect(capRow("System ceiling").segs.map((el) => el.style.background)).toEqual(["var(--fact)", "var(--success)"]);
    // The workspace cap: Anthropic's bill; the player's, then the two system inks, then elsewhere ($7.30); no eval ink.
    expect(screen.getByText("$130.00 of $250")).toBeInTheDocument();
    expect(capRow("The 99 workspace cap").segs.map((el) => el.style.background)).toEqual(["var(--accent)", "var(--fact)", "var(--success)", HATCH]);
    expect(capRow("The 99 workspace cap").row).toHaveTextContent("Elsewhere $7.30:");
    // Every line is reference only, and the page says so.
    expect(screen.getByText("The system ceiling and the Anthropic caps are reference lines. None of them blocks a call.")).toBeInTheDocument();
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
    expect(screen.getByText("System").parentElement).toHaveTextContent("labels, rewrites and prose");
  });

  it("applies from the month it starts on", () => {
    draw(rows([p(2, 1), sys(3, 0.5)], { settings: ceilingFrom("2026-10-01") }));
    expect(screen.getByText("$0.500 of $15")).toBeInTheDocument();
    expect(capRow("System ceiling").row).toHaveTextContent("System rows in model_calls and card label batches. Evals are not counted.");
    expect(capRow("System ceiling").ticks).toHaveLength(1);
    expect(screen.getByText("System").parentElement).toHaveTextContent("3% of the $15 ceiling");
  });

  it("calls the ceiling share a floor, and the figure so far, while system spend is still coming in", () => {
    draw(rows([p(2, 1), sys(3, 0.5)], { settings: ceilingFrom("2026-10-01"), outside: { batchMicro: 0, evalsMicro: 0, labelCallsMicro: 0, labelsIncomplete: true } }));
    const tile = screen.getByText("System").parentElement as HTMLElement;
    expect(tile).toHaveTextContent("$0.500 so far");
    expect(tile).toHaveTextContent("at least 3% of the $15 ceiling");
  });

  it("floors the ceiling share of a partial figure: 99.6% known is at least 99%, not at least 100%", () => {
    draw(rows([sys(3, 14.94)], { settings: ceilingFrom("2026-10-01"), outside: { batchMicro: 0, evalsMicro: 0, labelCallsMicro: 0, labelsIncomplete: true } }));
    expect(screen.getByText("System").parentElement).toHaveTextContent("at least 99% of the $15 ceiling");
  });

  it("names the year when it starts in another one", () => {
    draw(rows([sys(3, 0.5)], { settings: ceilingFrom("2027-01-01") }));
    expect(capRow("System ceiling").row).toHaveTextContent("Starts January 2027.");
  });
});

describe("CostsView, no app-wide limit (2026-10-17)", () => {
  it("draws no banner on a pace, at 80% of the old plan, or past the old stop", () => {
    for (const day of [p(2, 4), p(2, 8.1), p(2, 25)]) {
      const { unmount } = draw(rows([day]));
      expect(screen.queryByRole("status")).toBeNull();
      unmount();
    }
  });
});

describe("CostsView, other months", () => {
  it("draws an empty month with zeros and the empty line (C3)", () => {
    draw(rows([], { playerAccounts: 0, ownerMicro: 0 }));
    const calls = screen.getByText("Model calls").parentElement!;
    expect(within(calls).getByText("$0")).toBeInTheDocument();
    expect(within(calls).getByText("0 runs")).toBeInTheDocument();
    expect(screen.getByText("No model calls in October 2026.")).toBeInTheDocument();
    expect(screen.getByText("Per active account").parentElement).toHaveTextContent("no accounts with runs");
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

describe("the settings actions belong to the current month", () => {
  it("offers no setting action on a past month, whose rows they could not change", () => {
    draw(rows([p(2, 1)]), { year: 2026, month: 8 });
    for (const name of ["Change the cap", "Change the ceiling", "Change the org cap"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("offers all three on the current month, and no elsewhere entry", () => {
    draw(rows([p(2, 1)]));
    for (const name of ["Change the cap", "Change the ceiling", "Change the org cap"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /elsewhere/i })).toBeNull();
  });
});

describe("the workspace cap row", () => {
  const cap = { account_cap_usd: { micro: usdToMicro(150), asOf: "2026-10-01", note: "raised for the eval run" } };

  it("shows the note saved with the cap, read or not", () => {
    draw(rows([p(2, 1)], { ...billed(20), settings: cap }));
    expect(capRow("The 99 workspace cap").row).toHaveTextContent("Note: raised for the eval run");
  });

  it("names a ledger past the bill, and draws elsewhere as $0", () => {
    // Ledger $1.06 against a $1 bill: past the $0.05 floor.
    draw(rows([p(2, 1.06)], { ...billed(1), settings: cap }));
    const { row, segs } = capRow("The 99 workspace cap");
    expect(row).toHaveTextContent("This environment’s ledger reads more than the workspace bill, so elsewhere reads $0.");
    expect(row).not.toHaveTextContent("Elsewhere $");
    expect(segs.map((el) => el.style.width).at(-1)).toBe("0%");
  });

  it("says elsewhere is $0 with no remark inside the tolerance", () => {
    draw(rows([p(2, 1.04)], { ...billed(1), settings: cap }));
    const { row } = capRow("The 99 workspace cap");
    expect(row).toHaveTextContent("Elsewhere $0: the other environment");
    expect(row).not.toHaveTextContent("reads more than");
  });

  it("dates a read from another day", () => {
    render(<CostsView s={costSummary(rows([p(2, 1)], billed(5)), OCT, NOW)} names={{}} month={OCT} current={OCT} now={new Date("2026-10-12T00:10:00Z")} />);
    expect(capRow("The 99 workspace cap").row).toHaveTextContent("Read from Anthropic at 11 Oct, 14:55 UTC, about five minutes behind.");
  });

  it.each([
    [{ ok: false, kind: "no_key" }, "ANTHROPIC_ADMIN_KEY is not set here, so the workspace is not read."],
    [{ ok: false, kind: "refused" }, "Anthropic refused the admin key."],
    [{ ok: false, kind: "rejected" }, "Anthropic refused the request for this month."],
    [{ ok: false, kind: "upstream" }, "Anthropic’s cost report did not answer. A load a minute from now tries again."],
    [{ ok: false, kind: "shape" }, "Anthropic’s cost report came back in a shape this page does not read."],
    [{ ok: false, kind: "no_workspace" }, "No Anthropic workspace is named The 99."],
    [{ ok: false, kind: "ambiguous_workspace", count: 3 }, "3 Anthropic workspaces are named The 99, so none is read."],
  ] as const)("draws %j as the ledger alone on the bare track, with its reason", (anthropic, reason) => {
    draw(rows([p(2, 1), sys(3, 0.5)], { anthropic, settings: cap }));
    expect(screen.getByText("$1.500 here · workspace not read")).toBeInTheDocument();
    const { row, segs, ticks } = capRow("The 99 workspace cap");
    expect(row).toHaveTextContent(reason);
    expect(row).not.toHaveTextContent("Read from Anthropic");
    expect(segs).toEqual([]);
    expect(ticks).toEqual([]);
  });
});

describe("the org cap row", () => {
  const caps = {
    account_cap_usd: { micro: usdToMicro(150), asOf: "2026-10-01", note: null },
    org_cap_usd: { micro: usdToMicro(250), asOf: "2026-10-17", note: "console, Oct" },
  };

  it("draws the org's month against its cap: The 99, then other workspaces hatched", () => {
    draw(rows([p(2, 1)], { ...billed(124.54, 9), settings: caps }));
    expect(screen.getByText("$133.54 of $250")).toBeInTheDocument();
    const { row, segs, ticks } = capRow("Anthropic org cap");
    expect(row).toHaveTextContent("from Anthropic");
    expect(row).toHaveTextContent("The 99 $124.54, other workspaces $9.00 hatched, the default workspace included.");
    expect(row).toHaveTextContent("Note: console, Oct");
    expect(segs.map((el) => el.style.background)).toEqual(["var(--accent)", HATCH]);
    expect(parseFloat(segs[0].style.width)).toBeCloseTo((124.54 / 250) * 100, 3);
    expect(parseFloat(segs[1].style.width)).toBeCloseTo((9 / 250) * 100, 3);
    expect(ticks).toHaveLength(1);
    expect(ticks[0].style.left).toBe("100%");
  });

  it("names a credit on the other workspaces signed, and draws it as no width", () => {
    // The 99 at $100, the rest of the org a $20 credit: an $80 org, and the line says so rather than $0.
    draw(rows([p(2, 1)], { ...billed(100, -20), settings: caps }));
    expect(screen.getByText("$80.00 of $250")).toBeInTheDocument();
    const { row, segs } = capRow("Anthropic org cap");
    expect(row).toHaveTextContent("The 99 $100.00, other workspaces −$20.00 hatched");
    expect(segs.map((el) => el.style.width).at(-1)).toBe("0%");
  });

  it("draws the bare track with the figure not set when no org cap is stored", () => {
    draw(rows([p(2, 1)], billed(12, 3)));
    expect(screen.getByText("$15.00 · not set")).toBeInTheDocument();
    const { segs, ticks } = capRow("Anthropic org cap");
    expect(segs).toEqual([]);
    expect(ticks).toEqual([]);
  });

  it("draws the bare track when the org is not read, naming the workspace row's reason once", () => {
    draw(rows([p(2, 1)], { anthropic: { ok: false, kind: "refused" }, settings: caps }));
    const { row, segs, ticks } = capRow("Anthropic org cap");
    expect(row).toHaveTextContent("not read");
    expect(row).not.toHaveTextContent("$250");
    expect(segs).toEqual([]);
    expect(ticks).toEqual([]);
    expect(screen.getAllByText("Anthropic refused the admin key.")).toHaveLength(1);
  });

  it("saves the org cap through its own action", async () => {
    draw(rows([p(2, 1)]));
    fireEvent.click(screen.getByRole("button", { name: "Change the org cap" }));
    const dialog = screen.getByRole("dialog", { name: "Change the org cap" });
    expect(within(dialog).queryByLabelText("As of")).toBeNull();
    expect(within(dialog).queryByLabelText("Starts")).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Amount ($)"), { target: { value: "250" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(setOrgCap).toHaveBeenCalledWith({ amount: "250", note: "" }));
    expect(setAccountCap).not.toHaveBeenCalledWith({ amount: "250", note: "" });
  });
});

describe("the keys on The 99", () => {
  const list = () => screen.getByRole("heading", { name: "Keys on The 99" }).parentElement!.nextElementSibling as HTMLElement;

  it("lists each key's name, hint and status", () => {
    const keys: Keys = {
      ok: true,
      rows: [PROD_KEY, { name: "GitHub workflows", hint: null, status: "other", statusWord: "expired" }],
    };
    draw(rows([p(2, 1)], billed(5, 0, keys)));
    expect(screen.getByText("name and hint only")).toBeInTheDocument();
    const items = within(list()).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Production app");
    expect(items[0]).toHaveTextContent("sk-ant-api03-R2D...igAA");
    expect(items[0]).toHaveTextContent("active");
    expect(items[1]).toHaveTextContent("GitHub workflows");
    expect(items[1]).toHaveTextContent("expired");
  });

  it("says when the workspace holds no keys", () => {
    draw(rows([p(2, 1)], billed(5, 0, { ok: true, rows: [] })));
    expect(within(list()).getByText("No keys on this workspace.")).toBeInTheDocument();
    expect(within(list()).queryAllByRole("listitem")).toEqual([]);
  });

  it("says the list was not read, beside figures that were", () => {
    draw(rows([p(2, 1)], billed(5, 2, { ok: false, kind: "upstream" })));
    expect(within(list()).getByText("The key list was not read.")).toBeInTheDocument();
    expect(screen.getByText("$7.00 · not set")).toBeInTheDocument();
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
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 173, top: 0 } as DOMRect);
    // From md up (the setup's matchMedia stub reports a match only when told to): the whole head pins.
    const wide = vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    const head = render(<AdminHead env="staging" />);
    const header = head.container.querySelector("header")!;
    expect(header.className).toMatch(/(^|\s)sticky(\s|$)/);
    // Under a returned phone header too (card search plan PR B): nothing of the head is hidden from `md` up.
    expect(header.style.top).toBe("calc(var(--header-offset, 0px) - 0px)");
    expect(header.className).toContain("bg-[color:var(--bg)]");
    expect(observed).toBe(header);
    expect(document.documentElement.style.getPropertyValue("--admin-head-h")).toBe("173px");

    draw(rows([p(2, 1)]));
    const bar = screen.getByText("October 2026").closest("div.sticky")!;
    expect(bar.className).toContain("top-[calc(var(--header-offset,0px)+var(--admin-head-h,0px))]");
    expect(bar.className).not.toMatch(/(^|\s)top-0(\s|$)/);

    head.unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--admin-head-h")).toBe("");
    rect.mockRestore();
    wide.mockRestore();
    vi.unstubAllGlobals();
  });

  it("on a phone, lets the eyebrow, title and sub scroll away and pins the tab strip alone", () => {
    vi.stubGlobal("ResizeObserver", class {
      constructor(private cb: () => void) {}
      observe() { this.cb(); }
      disconnect() {}
    });
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    // The head is 160.4px tall and its tab strip starts 117.6px down it: unrounded, as a 20.8px line leaves it.
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return (this.tagName === "NAV" ? { top: 117.6, height: 42.8 } : { top: 0, height: 160.4 }) as DOMRect;
    });
    const head = render(<AdminHead env="staging" />);
    const header = head.container.querySelector("header")!;
    expect(header.style.top).toBe("calc(var(--header-offset, 0px) - 117.6px)");
    expect(parseFloat(document.documentElement.style.getPropertyValue("--admin-head-h"))).toBeCloseTo(42.8, 5);
    head.unmount();
    rect.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("says the month-end projection to a screen reader in the current month, and only the total in a past one", () => {
    const now = draw(rows([p(2, 1)]));
    expect(screen.getByText("Player runs in October 2026: $1.000, on pace for $2.82 by month end.")).toBeInTheDocument();
    now.unmount();
    const SEP = { year: 2026, month: 8 };
    draw(rows([p(2, 1)]), SEP);
    expect(screen.getByText("Player runs in September 2026: $1.000.")).toBeInTheDocument();
  });

  it("re-measures the head on a window resize where ResizeObserver does not exist", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    let height = 173;
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ height, top: 0 }) as DOMRect);
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
    // Costs first (Hugh's ruling), then Switches (admin PR 8a), then Groups (9a).
    expect(tabs.map((t) => [t.textContent, t.getAttribute("href"), t.getAttribute("aria-current")])).toEqual([
      ["Costs", "/admin", "page"],
      ["Switches", "/admin/switches", null],
      ["Groups", "/admin/groups", null],
      ["Accounts", "/admin/accounts", null],
      ["Models", "/admin/models", null],
      ["Invites", "/admin/invites", null],
    ]);
  });
});
