// The Costs detail's blocks (admin PR 3), drawn from real summaries and details, including STATES
// C3 (a month with no runs keeps only the eval ledgers) and C8 (a pending eval entry).
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { costDetail, type CallRow, type DetailRows, type LabelRunRow } from "../../lib/admin/costs-detail-rule";
import { costSummary, type CostRows } from "../../lib/admin/costs-rule";
import { usdToMicro } from "../../lib/model/spend-rule";

vi.mock("../../app/admin/actions", () => ({ setElsewhere: vi.fn(), setAccountCap: vi.fn(), setSystemCeiling: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

const { CostsView } = await import("./costs-view");

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-11T15:00:00Z");
let n = 0;
const call = (over: Partial<CallRow>): CallRow => ({
  id: `c${++n}`, userId: "user_hugh", feature: "tuning", origin: "player", status: "spent", model: "claude-sonnet-5", micro: 40_000, createdAt: new Date("2026-10-06T10:00:00Z"), ...over,
});
const labelRun: LabelRunRow = {
  runId: "backfill-2026-10-03", model: "claude-sonnet-4-5", batches: 2677, collected: 2677, open: 0, expired: 0, inTokens: 13_862_095, outTokens: 5_157_552, cacheWriteTokens: 0, cacheReadTokens: 0, firstAt: new Date("2026-10-03T07:20:15Z"),
};
const settledLedger = { file: "ledger.jsonl", entries: [{ at: "2026-09-24T06:03:01Z", usd: 0.229259, requests: 12 }] };

function draw(detailRows: Partial<DetailRows>, opts: { env?: "staging" | "production"; month?: typeof OCT } = {}) {
  const month = opts.month ?? OCT;
  const d = costDetail({ calls: [], parts: [], labelRuns: [], ledgers: [settledLedger], ...detailRows }, month);
  // The core's day rows from the same calls, as `loadCosts` reads them.
  const days = (detailRows.calls ?? []).map((c) => ({ day: c.createdAt.getUTCDate(), origin: c.origin, runs: 1, micro: c.micro ?? 0 }));
  const rows: CostRows = {
    days, playerAccounts: 1, ownerMicro: 0, ownerShareMicro: usdToMicro(5), previous: { runs: 0, micro: 0 }, settings: {}, paused: false,
    outside: { batchMicro: d.series.labels - d.labelCallsMicro, evalsMicro: d.series.evals, labelCallsMicro: d.labelCallsMicro, labelsIncomplete: d.labelsIncomplete, evalsUnreadable: d.ledgersUnreadable.length > 0 },
  };
  return render(<CostsView s={costSummary(rows, month, NOW)} detail={d} env={opts.env} month={month} current={OCT} />);
}

const headings = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

describe("CostsDetail, a month with runs", () => {
  const calls = [
    call({ micro: 39_000 }),
    call({ status: "refunded", micro: 50_000 }),
    call({ feature: "intake", model: "claude-haiku-5-5+claude-sonnet-5-5", micro: 22_000 }),
    call({ feature: "synopsis", origin: "system", model: "claude-sonnet-5-5", micro: 60_000, userId: "system" }),
  ];

  it("draws every block in the canvas's order", () => {
    draw({ calls, labelRuns: [labelRun] });
    expect(headings()).toEqual([
      "Against the caps", "Player presses, month to date", "By model", "Player against system", "By feature and model",
      "Refunds", "Reserved against spent", "Per account", "Card label runs", "Eval ledgers",
    ]);
  });

  it("names a composite model as one and leaves its effort not recorded (locked rule 13)", () => {
    const { container } = draw({ calls });
    const composite = container.querySelector('[data-model="claude-haiku-5-5+claude-sonnet-5-5"]') as HTMLElement;
    expect(composite).toHaveTextContent("a composite run from before the parts table, not split");
    const table = screen.getByRole("table", { name: "By feature and model" });
    const row = within(table).getByText("Help me choose").closest("[role=row]") as HTMLElement;
    expect(row).toHaveTextContent("haiku-5-5+sonnet-5-5");
    expect(row).toHaveTextContent("not recorded");
    // A system synopsis row is the free rewrite, on its own row.
    expect(within(table).getByText("Overview rewrite, free")).toBeInTheDocument();
  });

  it("draws the split with its four series and the refunds line", () => {
    const { container } = draw({ calls, labelRuns: [labelRun] });
    expect([...container.querySelectorAll("[data-series]")].map((el) => el.getAttribute("data-series"))).toEqual(["player", "labels", "evals", "rewrites"]);
    expect(container.querySelector('[data-series="labels"]')).toHaveTextContent("$59.48");
    expect(screen.getByText(/^One run was refunded: the player got the credit back, and the dollars stay billed\. Suggested changes 1 run, \$0\.050\.$/)).toBeInTheDocument();
  });

  it("holds each feature's mean against its reservation", () => {
    const { container } = draw({ calls });
    expect(container.querySelector('[data-feature="tuning"]')).toHaveTextContent(/\$0\.045 of \$0\.\d{3}/);
    expect(container.querySelector('[data-feature="proposed_cuts"]')).toHaveTextContent("no press yet");
  });

  it("says a press with no cost yet is a press, not none", () => {
    const { container } = draw({ calls: [...calls, call({ feature: "proposed_cuts", status: "reserved", micro: null })] });
    expect(container.querySelector('[data-feature="proposed_cuts"]')).toHaveTextContent("1 press, none priced yet");
  });

  it("marks label figures so far while chunks are still collecting", () => {
    const { container } = draw({ calls, labelRuns: [{ ...labelRun, batches: 2678, open: 1 }] });
    expect(container.querySelector('[data-series="labels"]')).toHaveTextContent("$59.48 so far");
    const labels = screen.getByRole("table", { name: "Card label runs" });
    expect(within(labels).getAllByText("$59.48 so far")).toHaveLength(2);
    expect(container.querySelector('[data-model="claude-sonnet-4-5"]')).toHaveTextContent("label runs still collecting or not priced");
    expect(container.querySelector('[data-model="claude-sonnet-4-5"]')).toHaveTextContent("$59.48 so far");
    // The caps hold system spend too: the ceiling and the account figures read so far as well.
    expect(screen.getByText("$59.53 so far · not set")).toBeInTheDocument();
    // A share of a total that is only a floor is not drawn, and the headline says it is a floor.
    expect(container.querySelector('[data-model="claude-sonnet-4-5"]')?.textContent).toContain("—");
    expect(container.querySelector('[data-model="claude-sonnet-4-5"]')?.textContent).not.toMatch(/\d%/);
    expect(container.querySelector('[data-series="player"]')?.textContent).not.toMatch(/\d%/);
    expect(screen.getByText(/^System is at least [\d.]+% of October, with some of its spend not in yet\.$/)).toBeInTheDocument();
    expect(screen.getByText("$59.65 so far · not set")).toBeInTheDocument();
  });

  it("lists accounts by id and the label runs by run", () => {
    draw({ calls, labelRuns: [labelRun] });
    const accounts = screen.getByRole("table", { name: "Per account" });
    expect(within(accounts).getByText("user_hugh")).toBeInTheDocument();
    expect(within(accounts).queryByText("system")).toBeNull();
    const labels = screen.getByRole("table", { name: "Card label runs" });
    expect(within(labels).getByText("Oct 3 · backfill-2026-10-03")).toBeInTheDocument();
    expect(within(labels).getByText("13.86M / 5.16M")).toBeInTheDocument();
  });

  it("names staging for label runs on production, and says none ran on staging", () => {
    const onProduction = "Card labels run on staging; production receives copies and calls no model for them.";
    const { unmount } = draw({ calls }, { env: "production" });
    expect(screen.getByText(onProduction)).toBeInTheDocument();
    expect(screen.queryByText("No label runs in October.")).toBeNull();
    unmount();
    draw({ calls }, { env: "staging" });
    expect(screen.getByText("No label runs in October.")).toBeInTheDocument();
    expect(screen.queryByText(onProduction)).toBeNull();
  });

  it("gives the phone card the same p90 as the desktop cell, a dash under five runs", () => {
    const { container } = draw({ calls });
    const metas = [...container.querySelectorAll(".md\\:hidden span.font-mono")].map((el) => el.textContent ?? "");
    expect(metas.some((m) => m.endsWith(" a run, p90 —"))).toBe(true);
  });

  it("reads an unpriceable model's spend as not priced in By model, never $0", () => {
    const { container } = draw({ calls, labelRuns: [{ ...labelRun, model: "claude-haiku-5-5" }] });
    const row = container.querySelector('[data-model="claude-haiku-5-5"]') as HTMLElement;
    expect(row).toHaveTextContent("not priced");
    expect(row).not.toHaveTextContent("$0.00");
  });

  it("counts credits in the singular and the plural", () => {
    const { container } = draw({ calls: [call({ userId: "user_one" }), call({ userId: "user_two" }), call({ userId: "user_two" })] });
    const metas = [...container.querySelectorAll(".md\\:hidden span.font-mono")].map((el) => el.textContent);
    expect(metas).toContain("1 press · 1 credit used");
    expect(metas).toContain("2 presses · 2 credits used");
  });

  it("draws a top border on every phone card, the first included", () => {
    const { container } = draw({ calls });
    const cards = [...container.querySelectorAll(".md\\:hidden > div")];
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) {
      expect(c.className).toContain("border-t");
      expect(c.className).not.toContain("first:border-t-0");
    }
  });

  it("spaces the split legend 28px between its columns", () => {
    const { container } = draw({ calls });
    expect(container.querySelector('[data-series="player"]')?.parentElement?.className).toContain("gap-x-[28px]");
  });
});

describe("CostsDetail, the split headline", () => {
  it("never rounds a sliver of player spend away into 100% system", () => {
    draw({ calls: [call({ micro: 2_000 }), call({ feature: "synopsis", origin: "system", userId: "system", micro: 998_000 })], ledgers: [] });
    expect(screen.getByText("System is 99.8% of October.")).toBeInTheDocument();
  });
});

describe("CostsDetail, the eval ledgers", () => {
  it("shows a pending entry beside settled, in warning ink (C8)", () => {
    draw({
      calls: [call({})],
      ledgers: [{ file: "ledger-cuts.jsonl", entries: [{ at: "2026-10-10T08:21:54Z", usd: 0.1, requests: 1 }, { at: "2026-10-11T08:00:00Z", usd: 2, requests: 24, pending: "r/a2" }] }],
    });
    const table = screen.getByRole("table", { name: "Eval ledgers" });
    const row = within(table).getByText("Cuts").closest("[role=row]") as HTMLElement;
    expect(row).toHaveTextContent("$0.100$2.00 pending");
    const pending = within(row).getByText("$2.00 pending");
    expect(pending.className).toContain("text-[color:var(--warning)]");
  });

  it("draws the canvas's columns: the limit the scripts enforce, and the ledger's window", () => {
    draw({
      calls: [call({})],
      ledgers: [
        settledLedger,
        { file: "ledger-help-me-choose.jsonl", entries: [{ at: "2026-10-10T19:00:00Z", usd: 0.5, requests: 3 }, { at: "2026-10-11T21:00:00Z", usd: 0.5, requests: 3 }] },
        { file: "ledger-tuning-lists.jsonl", entries: [{ at: "2026-09-30T19:00:00Z", usd: 0.2, requests: 1 }, { at: "2026-10-11T21:00:00Z", usd: 0.2, requests: 1 }] },
        { file: "ledger-new.jsonl", entries: [{ at: "2026-10-02T19:00:00Z", usd: 0.1, requests: 1 }] },
      ],
    });
    const table = screen.getByRole("table", { name: "Eval ledgers" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Ledger", "Requests", "Settled", "Limit", "Window"]);
    const row = (name: string) => within(table).getByText(name).closest("[role=row]") as HTMLElement;
    const cells = (name: string) => within(row(name)).getAllByRole("cell").map((c) => c.textContent);
    expect(cells("Original campaign").slice(3)).toEqual(["$25 hard · ask at $15", "Sep 24"]);
    expect(cells("Help me choose").slice(3)).toEqual(["$5 hard", "Oct 10–11"]);
    expect(cells("Tuning lists").slice(3)).toEqual(["$3 hard · ask at $2.50", "Sep 30–Oct 11"]);
    expect(cells("New").slice(3)).toEqual(["no limit in code", "Oct 2"]);
    expect(cells("October").slice(3)).toEqual(["nothing pending", ""]);
  });

  it("says nothing pending when every worst case has settled", () => {
    draw({ calls: [call({})] });
    expect(within(screen.getByRole("table", { name: "Eval ledgers" })).getByText("nothing pending")).toBeInTheDocument();
  });
});

describe("CostsDetail, an eval ledger that could not be read", () => {
  it("says which, and reads the eval and system figures as partial rather than complete", () => {
    const { container } = draw({ calls: [call({})], ledgersUnreadable: ["ledger-cuts.jsonl"] });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not read ledger-cuts.jsonl, so the eval figures leave it out.");
    expect(container.querySelector('[data-series="evals"]')).toHaveTextContent("so far");
    expect(container.querySelector('[data-model="evals"]')).toHaveTextContent("so far");
    expect(screen.getByText(/some label or eval spend is not in yet/)).toBeInTheDocument();
  });
});

describe("CostsDetail, a month with no runs (C3)", () => {
  it("hides every table but the eval ledgers", () => {
    draw({});
    expect(headings()).toEqual(["Against the caps", "Player presses, month to date", "Eval ledgers"]);
    expect(screen.getByRole("table", { name: "Eval ledgers" })).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Eval ledgers" })).getByText("Original campaign")).toBeInTheDocument();
  });
});
