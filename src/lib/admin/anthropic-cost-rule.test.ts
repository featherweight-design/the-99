import { describe, expect, it } from "vitest";
import {
  centsToMicro,
  costReportUrl,
  elsewhere,
  LEDGER_AHEAD_FLOOR_MICRO,
  matchWorkspace,
  parseCost,
  parseCostPage,
  parseWorkspacePage,
  reportWindow,
  sumCents,
  workspaceMicro,
  workspacesUrl,
} from "./anthropic-cost-rule";

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-17T14:05:42.123Z");

describe("centsToMicro", () => {
  it("converts cents to micro-dollars exactly: a cent is 10,000 micro", () => {
    expect(centsToMicro("1")).toBe(10_000);
    expect(centsToMicro("0")).toBe(0);
    expect(centsToMicro("12454")).toBe(124_540_000);
    expect(centsToMicro("123.45")).toBe(1_234_500);
    expect(centsToMicro("0.0001")).toBe(1);
    expect(centsToMicro("-250.5")).toBe(-2_505_000);
  });

  it("rounds half away from zero, on both sides", () => {
    expect(centsToMicro("0.00005")).toBe(1);
    expect(centsToMicro("-0.00005")).toBe(-1);
    expect(centsToMicro("0.000049999")).toBe(0);
    expect(centsToMicro("0.00015")).toBe(2);
    expect(centsToMicro("-0.00015")).toBe(-2);
  });

  it("holds digits a float would lose", () => {
    // 0.1 + 0.2 territory: string arithmetic, never parseFloat.
    expect(centsToMicro("0.30000000000000004")).toBe(3_000);
    expect(centsToMicro("1234567.891234")).toBe(12_345_678_912);
  });

  it("refuses anything that is not a plain decimal", () => {
    for (const bad of ["1e3", "", "1.2.3", " 1", "1.", ".5", "+1", "0x10", "NaN", "1,000"]) expect(centsToMicro(bad)).toBeNull();
  });
});

describe("sumCents: sum exactly, then round once per workspace", () => {
  it("does not round a month of sub-micro lines away line by line", () => {
    const rows = Array.from({ length: 31 }, () => ({ workspaceId: "ws_99", cents: parseCost("0.00004")! }));
    // 31 x 0.4 micro is 12.4 micro: 12, where rounding each line would give 0.
    expect(sumCents(rows).get("ws_99")).toBe(12);
  });

  it("keeps workspaces apart, the default workspace's null id included", () => {
    const rows = [
      { workspaceId: "ws_99", cents: parseCost("100")! },
      { workspaceId: null, cents: parseCost("5.5")! },
      { workspaceId: "ws_99", cents: parseCost("0.25")! },
      { workspaceId: "ws_other", cents: parseCost("7")! },
    ];
    const sums = sumCents(rows);
    expect(sums.get("ws_99")).toBe(1_002_500);
    expect(sums.get(null)).toBe(55_000);
    expect(sums.get("ws_other")).toBe(70_000);
    expect(workspaceMicro(rows, "ws_99")).toBe(1_002_500);
    expect(workspaceMicro(rows, "ws_none")).toBe(0);
  });
});

describe("parseCostPage", () => {
  const page = (data: unknown, more: { has_more?: unknown; next_page?: unknown } = {}) => ({ data, has_more: false, next_page: null, ...more });

  it("reads buckets, empty days included, across several workspaces", () => {
    const body = page([
      { starting_at: "2026-10-01T00:00:00Z", ending_at: "2026-10-02T00:00:00Z", results: [] },
      {
        starting_at: "2026-10-02T00:00:00Z",
        ending_at: "2026-10-03T00:00:00Z",
        results: [
          { amount: "120.5", currency: "USD", workspace_id: "ws_99" },
          { amount: "3", currency: "USD", workspace_id: null },
        ],
      },
    ], { has_more: true, next_page: "page_2" });
    const parsed = parseCostPage(body)!;
    expect(parsed.hasMore).toBe(true);
    expect(parsed.nextPage).toBe("page_2");
    expect(parsed.rows.map((r) => r.workspaceId)).toEqual(["ws_99", null]);
    expect(workspaceMicro(parsed.rows, "ws_99")).toBe(1_205_000);
  });

  it("reads a result with no workspace_id field as the default workspace", () => {
    const parsed = parseCostPage(page([{ results: [{ amount: "1", currency: "USD" }] }]))!;
    expect(parsed.rows[0].workspaceId).toBeNull();
  });

  it("refuses a body off the documented shape", () => {
    for (const bad of [
      null,
      "text",
      {},
      page("not a list"),
      page([{ results: "x" }]),
      page([{ results: [{ amount: 1, currency: "USD", workspace_id: "w" }] }]),
      page([{ results: [{ amount: "1e3", currency: "USD", workspace_id: "w" }] }]),
      page([{ results: [{ amount: "1", currency: "EUR", workspace_id: "w" }] }]),
      page([{ results: [{ amount: "1", currency: "USD", workspace_id: 7 }] }]),
      page([], { has_more: "yes" }),
      page([], { has_more: true, next_page: null }),
    ]) expect(parseCostPage(bad)).toBeNull();
  });
});

describe("parseWorkspacePage", () => {
  it("reads items, the archived mark and the next page's cursor", () => {
    const parsed = parseWorkspacePage({
      data: [
        { id: "ws_99", name: "The 99", archived_at: null },
        { id: "ws_old", name: "Old", archived_at: "2026-01-01T00:00:00Z" },
      ],
      has_more: true,
      first_id: "ws_99",
      last_id: "ws_old",
    })!;
    expect(parsed.items).toEqual([
      { id: "ws_99", name: "The 99", archived: false },
      { id: "ws_old", name: "Old", archived: true },
    ]);
    expect(parsed).toMatchObject({ hasMore: true, lastId: "ws_old" });
  });

  it("refuses a body off the documented shape", () => {
    for (const bad of [null, {}, { data: [{ id: 1, name: "x" }], has_more: false }, { data: [], has_more: true, last_id: null }]) {
      expect(parseWorkspacePage(bad)).toBeNull();
    }
  });
});

describe("matchWorkspace", () => {
  const ws = (id: string, name: string, archived = false) => ({ id, name, archived });

  it("finds none", () => {
    expect(matchWorkspace([ws("a", "Concert Crawl")])).toEqual({ ok: false, kind: "no_workspace" });
    expect(matchWorkspace([])).toEqual({ ok: false, kind: "no_workspace" });
  });

  it("finds one, trimmed and ignoring case", () => {
    expect(matchWorkspace([ws("a", "Concert Crawl"), ws("b", "  the 99 ")])).toEqual({ ok: true, id: "b" });
  });

  it("never guesses between two", () => {
    expect(matchWorkspace([ws("a", "The 99"), ws("b", "THE 99")])).toEqual({ ok: false, kind: "ambiguous_workspace", count: 2 });
  });

  it("skips an archived workspace of the same name", () => {
    expect(matchWorkspace([ws("a", "The 99", true), ws("b", "The 99")])).toEqual({ ok: true, id: "b" });
    expect(matchWorkspace([ws("a", "The 99", true)])).toEqual({ ok: false, kind: "no_workspace" });
  });

  it("does not match a name that merely contains it", () => {
    expect(matchWorkspace([ws("a", "The 99 staging")])).toEqual({ ok: false, kind: "no_workspace" });
  });
});

describe("elsewhere", () => {
  it("is the workspace less this environment's ledger", () => {
    expect(elsewhere(150_000_000, 25_460_000)).toEqual({ micro: 124_540_000, ledgerAhead: false });
  });

  it("is floored at 0", () => {
    expect(elsewhere(1_000_000, 1_010_000)).toEqual({ micro: 0, ledgerAhead: false });
  });

  it("raises ledgerAhead one micro past the 1% tolerance, not at it", () => {
    // $100 workspace: 1% is $1, over the $0.05 floor.
    expect(elsewhere(100_000_000, 101_000_000)).toEqual({ micro: 0, ledgerAhead: false });
    expect(elsewhere(100_000_000, 101_000_001)).toEqual({ micro: 0, ledgerAhead: true });
  });

  it("raises ledgerAhead one micro past the $0.05 floor, not at it", () => {
    // $1 workspace: 1% is $0.01, under the floor.
    expect(elsewhere(1_000_000, 1_000_000 + LEDGER_AHEAD_FLOOR_MICRO)).toEqual({ micro: 0, ledgerAhead: false });
    expect(elsewhere(1_000_000, 1_000_001 + LEDGER_AHEAD_FLOOR_MICRO)).toEqual({ micro: 0, ledgerAhead: true });
    expect(elsewhere(0, LEDGER_AHEAD_FLOOR_MICRO + 1)).toEqual({ micro: 0, ledgerAhead: true });
  });
});

describe("reportWindow", () => {
  it("clamps the current month's end to now, floored to the minute", () => {
    expect(reportWindow(OCT, NOW)).toEqual({ startingAt: "2026-10-01T00:00:00Z", endingAt: "2026-10-17T14:05:00Z" });
  });

  it("ends a past month at the next month's start", () => {
    expect(reportWindow({ year: 2026, month: 8 }, NOW)).toEqual({ startingAt: "2026-09-01T00:00:00Z", endingAt: "2026-10-01T00:00:00Z" });
    expect(reportWindow({ year: 2025, month: 11 }, NOW)).toEqual({ startingAt: "2025-12-01T00:00:00Z", endingAt: "2026-01-01T00:00:00Z" });
  });

  it("holds the last day of a month", () => {
    const last = new Date("2026-10-31T23:59:59.999Z");
    expect(reportWindow(OCT, last)).toEqual({ startingAt: "2026-10-01T00:00:00Z", endingAt: "2026-10-31T23:59:00Z" });
  });

  it("omits the end in the month's first minute, rather than send an empty window", () => {
    expect(reportWindow(OCT, new Date("2026-10-01T00:00:30Z"))).toEqual({ startingAt: "2026-10-01T00:00:00Z", endingAt: null });
  });
});

describe("the URLs", () => {
  it("asks for daily buckets grouped by workspace, a month to a page", () => {
    const url = costReportUrl({ startingAt: "2026-10-01T00:00:00Z", endingAt: "2026-10-17T14:05:00Z" });
    expect(url.startsWith("https://api.anthropic.com/v1/organizations/cost_report?")).toBe(true);
    expect(url).toContain("starting_at=2026-10-01T00%3A00%3A00Z");
    expect(url).toContain("ending_at=2026-10-17T14%3A05%3A00Z");
    expect(url).toContain("bucket_width=1d");
    expect(url).toContain("group_by[]=workspace_id");
    expect(url).toContain("limit=31");
    expect(url).not.toContain("page=");
  });

  it("sends the next page, and no end when the window has none", () => {
    const url = costReportUrl({ startingAt: "2026-10-01T00:00:00Z", endingAt: null }, "abc/=");
    expect(url).toContain("page=abc%2F%3D");
    expect(url).not.toContain("ending_at");
  });

  it("lists workspaces a thousand at a time, never the archived ones", () => {
    expect(workspacesUrl()).toBe("https://api.anthropic.com/v1/organizations/workspaces?limit=1000");
    expect(workspacesUrl("ws_last")).toBe("https://api.anthropic.com/v1/organizations/workspaces?limit=1000&after_id=ws_last");
    expect(workspacesUrl("x")).not.toContain("include_archived");
  });
});
