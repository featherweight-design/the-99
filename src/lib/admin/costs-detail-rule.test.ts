// The Costs detail's arithmetic (admin PR 3), on rows shaped like staging's October.
import { describe, expect, it } from "vitest";
import { batchCostMicroUsd, featureWorstCaseMicroUsd } from "../model/prices";
import { usdToMicro } from "../model/spend-rule";
import { costDetail, ledgerName, ledgerRow, percentileCont, shortModel, type CallRow, type DetailRows, type LabelRunRow, type PartRow } from "./costs-detail-rule";

const OCT = { year: 2026, month: 9 };
let n = 0;
const call = (over: Partial<CallRow>): CallRow => ({
  id: `c${++n}`, userId: "user_hugh", feature: "tuning", origin: "player", status: "spent", model: "claude-sonnet-5", micro: 40_000, createdAt: new Date("2026-10-06T10:00:00Z"), ...over,
});
const part = (callId: string, over: Partial<PartRow>): PartRow => ({ callId, step: "call", model: "claude-sonnet-5", effort: "medium", micro: 10_000, ...over });
const labelRun = (over: Partial<LabelRunRow>): LabelRunRow => ({
  runId: "backfill-2026-10-03", model: "claude-sonnet-4-5", batches: 2677, collected: 2677, inTokens: 13_862_095, outTokens: 5_157_552, cacheWriteTokens: 0, cacheReadTokens: 0, firstAt: new Date("2026-10-03T07:20:15Z"), ...over,
});
const rows = (over: Partial<DetailRows>): DetailRows => ({ calls: [], parts: [], labelRuns: [], ledgers: [], ...over });

describe("percentileCont", () => {
  it("interpolates as Postgres does", () => {
    expect(percentileCont([10, 20, 30, 40, 50], 0.9)).toBe(46);
    expect(percentileCont([5], 0.9)).toBe(5);
    expect(percentileCont([], 0.9)).toBeNull();
    // Order of the input does not matter.
    expect(percentileCont([50, 10, 40, 20, 30], 0.9)).toBe(46);
  });
});

describe("costDetail, by model", () => {
  it("names a pre-parts composite as one row and never splits it (locked rule 13)", () => {
    const d = costDetail(rows({ calls: [call({ feature: "intake", model: "claude-haiku-5-5+claude-sonnet-5-5", micro: 22_000 })] }), OCT);
    expect(d.models).toHaveLength(1);
    expect(d.models[0]).toMatchObject({ model: "claude-haiku-5-5+claude-sonnet-5-5", composite: true, micro: 22_000, calls: 1 });
    expect(d.features[0]).toMatchObject({ model: "claude-haiku-5-5+claude-sonnet-5-5", effort: null, step: null });
  });

  it("splits a run with parts by each part's model, effort and step", () => {
    const c = call({ feature: "intake", model: "claude-haiku-5-5+claude-sonnet-5-5", micro: 30_000 });
    const d = costDetail(rows({
      calls: [c],
      parts: [part(c.id, { step: "shortlist", model: "claude-haiku-5-5", micro: 8_000 }), part(c.id, { step: "judgement", model: "claude-sonnet-5-5", effort: null, micro: 22_000 })],
    }), OCT);
    expect(d.models.map((m) => [m.model, m.micro, m.calls, m.composite])).toEqual([
      ["claude-sonnet-5-5", 22_000, 1, false],
      ["claude-haiku-5-5", 8_000, 1, false],
    ]);
    expect(d.features.map((f) => [f.step, f.model, f.effort, f.runs])).toEqual([
      ["judgement", "claude-sonnet-5-5", null, 1],
      ["shortlist", "claude-haiku-5-5", "medium", 1],
    ]);
    // One run, two provider calls: the run count is the run.
    expect(d.runs).toBe(1);
    expect(d.callsMicro).toBe(30_000);
  });

  it("inks a model's dollars by origin, and labels from both writers", () => {
    const d = costDetail(rows({
      calls: [
        call({ micro: 100_000 }),
        call({ origin: "system", feature: "synopsis", micro: 50_000 }),
        call({ origin: "system", feature: "labels", model: "claude-sonnet-4-5", micro: 7_000, createdAt: new Date("2026-10-07T00:00:00Z") }),
      ],
      labelRuns: [labelRun({})],
    }), OCT);
    const sonnet5 = d.models.find((m) => m.model === "claude-sonnet-5");
    expect(sonnet5?.segs).toEqual({ player: 100_000, rewrites: 50_000, labels: 0 });
    const batch = batchCostMicroUsd("claude-sonnet-4-5", labelRun({}));
    expect(batch / 1e6).toBeCloseTo(59.47, 2);
    const sonnet45 = d.models.find((m) => m.model === "claude-sonnet-4-5");
    expect(sonnet45).toMatchObject({ micro: batch + 7_000, batches: 2677, calls: 1, segs: { player: 0, rewrites: 0, labels: batch + 7_000 } });
    // Disjoint writers, summed (audit findings 3 and 8): both listed, each by its source.
    expect(d.labelRuns.map((r) => [r.source, r.runId, r.micro])).toEqual([["batches", "backfill-2026-10-03", batch], ["collector", null, 7_000]]);
    expect(d.series).toEqual({ player: 100_000, rewrites: 50_000, labels: batch + 7_000, evals: 0 });
    expect(d.labelCallsMicro).toBe(7_000);
  });

  it("folds a run's chunks into one row, and prices only collected tokens", () => {
    const d = costDetail(rows({
      labelRuns: [
        labelRun({ runId: "backfill-2026-10-04", batches: 2678, inTokens: 14_400_000, outTokens: 5_300_000, firstAt: new Date("2026-10-04T16:54:00Z") }),
        labelRun({ runId: "backfill-2026-10-04", batches: 1, collected: 0, inTokens: 0, outTokens: 0, firstAt: new Date("2026-10-07T00:00:00Z") }),
        labelRun({ runId: "weekly-2026-W40", batches: 127, collected: 0, inTokens: 0, outTokens: 0, firstAt: new Date("2026-10-05T00:00:00Z") }),
      ],
    }), OCT);
    expect(d.labelRuns.map((r) => [r.runId, r.batches, r.tokens])).toEqual([
      ["backfill-2026-10-04", 2679, { in: 14_400_000, out: 5_300_000 }],
      ["weekly-2026-W40", 127, null],
    ]);
    expect(d.labelRuns[1].micro).toBe(0);
  });

  it("prices a dated model id as its model", () => {
    const d = costDetail(rows({ labelRuns: [labelRun({ model: "claude-haiku-4-5-20251001", inTokens: 1_000_000, outTokens: 0 })] }), OCT);
    expect(d.labelRuns[0].micro).toBe(500_000);
  });
});

describe("costDetail, by feature", () => {
  it("gives the month's mean, and a p90 only from five runs", () => {
    const five = [10, 20, 30, 40, 50].map((v) => call({ micro: v * 1_000 }));
    const two = [1, 3].map((v) => call({ feature: "proposed_cuts", micro: v * 1_000 }));
    const d = costDetail(rows({ calls: [...five, ...two] }), OCT);
    const tuning = d.features.find((f) => f.feature === "tuning");
    expect(tuning).toMatchObject({ runs: 5, micro: 150_000, meanMicro: 30_000, p90Micro: 46_000, effort: null });
    expect(d.features.find((f) => f.feature === "proposed_cuts")).toMatchObject({ runs: 2, meanMicro: 2_000, p90Micro: null });
  });

  it("keeps a free rewrite apart from the paid press, and leaves out unpriced runs", () => {
    const d = costDetail(rows({
      calls: [call({ feature: "synopsis" }), call({ feature: "synopsis", origin: "system" }), call({ feature: "synopsis", micro: null, status: "refunded" })],
    }), OCT);
    expect(d.features.map((f) => [f.feature, f.origin, f.runs])).toEqual([["synopsis", "player", 1], ["synopsis", "system", 1]]);
    expect(d.runs).toBe(2);
  });
});

describe("costDetail, refunds, reservations and accounts", () => {
  it("counts player refunds by feature, and the dollars stay billed", () => {
    const d = costDetail(rows({
      calls: [call({ status: "refunded", micro: 40_000 }), call({ status: "refunded", micro: 20_000 }), call({ feature: "intake", status: "refunded", micro: 5_000 }), call({ origin: "system", status: "refunded" })],
    }), OCT);
    expect(d.refunds).toEqual({ runs: 3, micro: 65_000, byFeature: [{ feature: "tuning", runs: 2, micro: 60_000 }, { feature: "intake", runs: 1, micro: 5_000 }] });
  });

  it("holds each feature's mean against its worst case, null with no press", () => {
    const d = costDetail(rows({ calls: [call({ micro: 39_000 }), call({ micro: 41_000 }), call({ origin: "system", micro: 900_000 })] }), OCT);
    const tuning = d.reserved.find((r) => r.feature === "tuning");
    expect(tuning).toEqual({ feature: "tuning", reservedMicro: featureWorstCaseMicroUsd("tuning"), meanMicro: 40_000, runs: 2 });
    expect(d.reserved.find((r) => r.feature === "proposed_cuts")?.meanMicro).toBeNull();
    expect(d.reserved.map((r) => r.feature)).toEqual(["tuning", "synopsis", "intake", "proposed_cuts", "fits_read"]);
  });

  it("sums each account's presses, credits used and dollars, players only", () => {
    const d = costDetail(rows({
      calls: [call({ userId: "a" }), call({ userId: "a", status: "refunded", micro: 1_000 }), call({ userId: "b", micro: 90_000 }), call({ userId: "c", origin: "system" })],
    }), OCT);
    expect(d.accounts).toEqual([
      { userId: "b", presses: 1, credits: 1, micro: 90_000 },
      { userId: "a", presses: 2, credits: 1, micro: 41_000 },
    ]);
  });
});

describe("the eval ledgers", () => {
  const ledger = {
    file: "ledger-cuts.jsonl",
    entries: [
      { at: "2026-09-30T23:00:00Z", usd: 1, requests: 2 },
      { at: "2026-10-10T08:21:51Z", usd: 0.5, requests: 1, pending: "r/a1" },
      { at: "2026-10-10T08:21:54Z", usd: 0.1, requests: 1, settles: "r/a1" },
      { at: "2026-10-11T08:00:00Z", usd: 2, requests: 24, pending: "r/a2" },
    ],
  };

  it("nets as spent() does: a settled pending drops, an open one counts", () => {
    expect(ledgerRow(ledger, OCT)).toEqual({ file: "ledger-cuts.jsonl", requests: 1, settledMicro: usdToMicro(0.1), pendingMicro: usdToMicro(2), allTimeMicro: usdToMicro(3.1), firstAt: "2026-09-30T23:00:00Z", lastAt: "2026-10-11T08:00:00Z", limits: { hardCapUsd: 15, askAtUsd: 10 } });
    expect(ledgerRow(ledger, { year: 2026, month: 8 })).toMatchObject({ requests: 2, settledMicro: usdToMicro(1), pendingMicro: 0 });
  });

  it("carries the limits the eval scripts enforce, and none for a file no script guards", () => {
    expect(ledgerRow({ ...ledger, file: "ledger-help-me-choose.jsonl" }, OCT).limits).toEqual({ hardCapUsd: 5, askAtUsd: null });
    expect(ledgerRow({ ...ledger, file: "ledger-unknown.jsonl" }, OCT).limits).toBeNull();
  });

  it("brings the month's evals into the series, pending included", () => {
    const d = costDetail(rows({ ledgers: [ledger] }), OCT);
    expect(d.series.evals).toBe(usdToMicro(2.1));
    expect(d.modelsTotal).toBe(usdToMicro(2.1));
  });

  it("names a ledger from its file", () => {
    expect(ledgerName("ledger-help-me-choose.jsonl", "Original")).toBe("Help me choose");
    expect(ledgerName("ledger.jsonl", "Original")).toBe("Original");
  });
});

describe("shortModel", () => {
  it("drops the vendor prefix, on both halves of a composite", () => {
    expect(shortModel("claude-haiku-5-5+claude-sonnet-5-5")).toBe("haiku-5-5+sonnet-5-5");
  });
});
