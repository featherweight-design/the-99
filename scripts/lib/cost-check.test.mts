// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { neonWeek, splitWeeks, summariseCharges, summariseNeon } from "./cost-sources.mjs";
import { evaluate, THRESHOLDS } from "./cost-thresholds.mjs";
import { renderReport } from "./cost-report.mjs";

const row = (ServiceName: string, ConsumedQuantity: number, EffectiveCost: number, day = "2026-10-20", ConsumedUnit: string | null = "unit") =>
  ({ ServiceName, ConsumedQuantity, EffectiveCost, ConsumedUnit, ChargePeriodStart: `${day}T07:00:00.000Z` });

const week = (over: Record<string, number> = {}) => ({
  costUsd: 17, buildMinutes: 3600, buildUsd: 12.6, functionGbHours: 5, activeCpuHours: 1.3, invocations: 110000, transferGb: 3, observabilityEvents: 270000, ...over,
});

describe("summariseCharges", () => {
  it("sums by service and leaves the plan seat out of usage", () => {
    const s = summariseCharges([
      row("Build CPU Minutes", 100, 0.35), row("Build CPU Minutes", 50, 0.175), row("Fast Data Transfer", 2, 0), row("Fast Origin Transfer", 1.5, 0.1),
      row("Pro", 0, 20, "2026-10-20", null),
    ]);
    expect(s.buildMinutes).toBe(150);
    expect(s.transferGb).toBe(3.5);
    expect(s.costUsd).toBeCloseTo(0.625);
  });
});

describe("unreadable figures fail the read instead of counting as zero", () => {
  it("a usage row with an unreadable cost or quantity throws", () => {
    expect(() => summariseCharges([row("Build CPU Minutes", NaN, 1)])).toThrow(/unreadable/);
    expect(() => summariseCharges([{ ServiceName: "Build CPU Minutes", ConsumedUnit: "minute", EffectiveCost: null, ConsumedQuantity: 3 }])).toThrow(/unreadable/);
    expect(() => summariseCharges([{ ServiceName: "Build CPU Minutes", ConsumedUnit: "minute", ConsumedQuantity: "x" }])).toThrow(/unreadable/);
  });
  it("a Neon project without its counters throws", () => {
    expect(() => summariseNeon({ project: {}, branches: [], endpoints: [] } as never, new Date())).toThrow(/compute_time_seconds/);
    expect(() => summariseNeon({ project: { compute_time_seconds: 1 }, branches: [], endpoints: [] } as never, new Date())).toThrow(/data_transfer_bytes/);
  });
});

describe("splitWeeks", () => {
  it("puts rows on or after the cut in this week and earlier ones in last week", () => {
    const cut = new Date("2026-10-16T00:00:00Z");
    const { thisWeek, lastWeek } = splitWeeks([row("Build CPU Minutes", 10, 1, "2026-10-17"), row("Build CPU Minutes", 4, 1, "2026-10-10")], cut);
    expect([thisWeek.buildMinutes, lastWeek.buildMinutes]).toEqual([10, 4]);
  });
});

const neonRaw = (over: Record<string, unknown> = {}, endpoints: unknown[] = []) => ({
  project: { compute_time_seconds: 3600 * 100, data_transfer_bytes: 50e9 },
  branches: [
    { id: "br-a", name: "production", compute_time_seconds: 3600 * 60, data_transfer_bytes: 10e9, logical_size: 1.3e9 },
    { id: "br-b", name: "scratch-x", compute_time_seconds: 10, data_transfer_bytes: 1, logical_size: 0.8e9 },
  ],
  endpoints,
  ...over,
});

describe("summariseNeon", () => {
  it("lists every scratch branch with its compute ceiling, and only scratch branches", () => {
    const s = summariseNeon(neonRaw({}, [
      { branch_id: "br-a", autoscaling_limit_max_cu: 1 }, { branch_id: "br-b", autoscaling_limit_max_cu: 1 },
    ]) as never, new Date("2026-10-23T00:00:00Z"));
    expect(s.scratchEndpoints).toEqual([{ branch: "scratch-x", maxCu: 1 }]);
    expect(s.branchCount).toBe(2);
  });
  it("keeps a scratch branch at 0.25 too", () => {
    const s = summariseNeon(neonRaw({}, [{ branch_id: "br-b", autoscaling_limit_max_cu: 0.25 }]) as never, new Date("2026-10-23T00:00:00Z"));
    expect(s.scratchEndpoints).toEqual([{ branch: "scratch-x", maxCu: 0.25 }]);
  });
});

describe("neonWeek", () => {
  const snap = (at: string, cu: number, gb: number) => ({ at, month: at.slice(0, 7), computeSeconds: cu * 3600, transferBytes: gb * 1e9 });
  it("scales the change since the snapshot to seven days", () => {
    const w = neonWeek(snap("2026-10-23T00:00:00Z", 300, 90) as never, snap("2026-10-16T00:00:00Z", 100, 40) as never)!;
    expect(w.computeCuHours).toBeCloseTo(200);
    expect(w.transferGb).toBeCloseTo(50);
    const half = neonWeek(snap("2026-10-23T00:00:00Z", 300, 90) as never, snap("2026-10-19T12:00:00Z", 250, 80) as never)!;
    expect(half.days).toBeCloseTo(3.5);
    expect(half.computeCuHours).toBeCloseTo(100);
  });
  it("makes no comparison without a snapshot, within a day, across a month, or when a counter went down", () => {
    const cur = snap("2026-11-02T00:00:00Z", 10, 1) as never;
    expect(neonWeek(cur, null)).toBeNull();
    expect(neonWeek(snap("2026-10-23T12:00:00Z", 5, 1) as never, snap("2026-10-23T00:00:00Z", 1, 1) as never)).toBeNull();
    expect(neonWeek(cur, snap("2026-10-30T00:00:00Z", 900, 400) as never)).toBeNull();
    expect(neonWeek(snap("2026-10-23T00:00:00Z", 5, 1) as never, snap("2026-10-16T00:00:00Z", 9, 1) as never)).toBeNull();
  });
});

describe("evaluate", () => {
  const calm = summariseNeon(neonRaw({}, []) as never, new Date("2026-10-23T00:00:00Z"));
  const run = (o: Record<string, unknown>) => evaluate({ vercel: { thisWeek: week(), lastWeek: week() }, neon: calm, neonWeek: { days: 7, computeCuHours: 150, transferGb: 20 }, ...o } as never);
  const fired = (v: { rules: { id: string; fired: boolean }[] }) => v.rules.filter((r) => r.fired).map((r) => r.id);

  it("is green on the October baseline", () => {
    expect(fired(run({}))).toEqual([]);
    expect(run({}).red).toBe(false);
  });
  it("fires on a Vercel week over the ceiling", () => {
    expect(fired(run({ vercel: { thisWeek: week({ costUsd: THRESHOLDS.vercelWeekUsd + 1 }), lastWeek: week() } }))).toEqual(["vercel-cost"]);
  });
  it("fires on Vercel growth only when both the factor and the dollar floor are met", () => {
    expect(fired(run({ vercel: { thisWeek: week({ costUsd: 26 }), lastWeek: week({ costUsd: 17 }) } }))).toEqual(["vercel-cost"]);
    expect(fired(run({ vercel: { thisWeek: week({ costUsd: 6 }), lastWeek: week({ costUsd: 3 }) } }))).toEqual([]);
  });
  it("fires on build minutes up 50% and 1,500 minutes", () => {
    expect(fired(run({ vercel: { thisWeek: week({ buildMinutes: 5500 }), lastWeek: week() } }))).toEqual(["build-minutes"]);
    expect(fired(run({ vercel: { thisWeek: week({ buildMinutes: 1500 }), lastWeek: week({ buildMinutes: 900 }) } }))).toEqual([]);
  });
  it("fires on Neon compute and transfer past their weekly ceilings", () => {
    expect(fired(run({ neonWeek: { days: 7, computeCuHours: 201, transferGb: 101 } }))).toEqual(["neon-compute", "neon-transfer"]);
  });
  it("skips, and does not fire, the Neon comparisons without a snapshot", () => {
    const v = run({ neonWeek: null });
    expect(fired(v)).toEqual([]);
    expect(v.rules.filter((r: { skipped?: boolean }) => r.skipped).map((r: { id: string }) => r.id)).toEqual(["neon-compute", "neon-transfer"]);
  });
  it("fires on too many branches and on a scratch branch above 0.25 CU", () => {
    expect(fired(run({ neon: { ...calm, branchCount: 11 } }))).toEqual(["branches"]);
    expect(fired(run({ neon: { ...calm, scratchEndpoints: [{ branch: "scratch-x", maxCu: 1 }] } }))).toEqual(["scratch-cap"]);
  });
  it("compares scratch ceilings with the configured cap, not a fixed one", () => {
    const neon = { ...calm, scratchEndpoints: [{ branch: "scratch-x", maxCu: 1 }] };
    const at = (scratchMaxCu: number) => evaluate({ vercel: { thisWeek: week(), lastWeek: week() }, neon, neonWeek: null } as never, { ...THRESHOLDS, scratchMaxCu });
    expect(fired(at(1))).toEqual([]);
    expect(fired(at(0.5))).toEqual(["scratch-cap"]);
  });
  it("counts an increase of exactly 50% as growth", () => {
    expect(fired(run({ vercel: { thisWeek: week({ costUsd: 24 }), lastWeek: week({ costUsd: 16 }) } }))).toEqual(["vercel-cost"]);
    expect(fired(run({ vercel: { thisWeek: week({ buildMinutes: 4500 }), lastWeek: week({ buildMinutes: 3000 }) } }))).toEqual(["build-minutes"]);
  });
  it("is red when either source could not be read, never silently green", () => {
    expect(fired(run({ vercel: null }))).toEqual(["vercel-read"]);
    expect(run({ neon: null, neonWeek: null }).red).toBe(true);
    expect(fired(run({ neon: null, neonWeek: null }))).toEqual(["neon-read"]);
  });
});

describe("renderReport", () => {
  it("shows a row for every rule, the verdict and the build counts", () => {
    const verdict = evaluate({ vercel: { thisWeek: week(), lastWeek: week() }, neon: null, neonWeek: null });
    const md = renderReport({ date: "2026-10-26", vercel: { thisWeek: week(), lastWeek: week() }, neon: null, neonWeek: null, verdict, builds: { "the-99": 90 } });
    expect(md).toContain("**RED**");
    expect(md).toContain("Neon could be read");
    expect(md).toContain("the-99 90");
    for (const r of verdict.rules) expect(md).toContain(`| ${r.label} |`);
  });
});

describe("the check is read-only", () => {
  const read = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
  it("sends no request but a GET: one fetch, no verb option, no write method names", () => {
    const src = read("scripts/lib/cost-sources.mjs");
    expect(src.match(/\bfetch\(/g)).toHaveLength(1);
    expect(src).not.toMatch(/\bmethod\s*:/i);
    expect(src).not.toMatch(/\b(POST|PUT|PATCH|DELETE)\b/);
  });
  it("the script reaches the network only through those helpers", () => {
    const src = read("scripts/cost-check.mjs");
    expect(src).not.toMatch(/\bfetch\(|https?:\/\//);
  });
});
