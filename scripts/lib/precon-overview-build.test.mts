import { describe, expect, it } from "vitest";
import type { CheckedSynopsis } from "../../src/lib/synopsis/types";
import { PRECON_OVERVIEW_CAP_USD, capMicroUsd, runBuild, takeWithinCap, worstMicroUsd, type Job, type Outgoing, type Send } from "./precon-overview-build";

const ok = (): CheckedSynopsis => ({ verdicts: [{ section: "overview", status: "ok" }] } as unknown as CheckedSynopsis);
const refused = (): CheckedSynopsis => ({ verdicts: [{ section: "overview", status: "refused" }] } as unknown as CheckedSynopsis);

/** A precon whose first answer is `first` and whose repair (if sent) is `repair`. */
function job(file: string, worstMicro: number, first: "ok" | "refused", repair: "ok" | "refused" = "ok"): Job<string> {
  return {
    file,
    first: { customId: file, params: {}, worstMicro },
    check: async (v) => (v === "ok" ? ok() : refused()),
    repair: async (): Promise<Outgoing> => ({ customId: `${file}-r`, params: {}, worstMicro }),
    merge: async (_c: CheckedSynopsis, v: string) => (v === "ok" ? ok() : refused()),
    ...{ answers: { [file]: first, [`${file}-r`]: repair } },
  } as Job<string>;
}

/** Answers each request from its job's script, costing `micro` each; records every batch sent. */
function sender(jobs: Job<string>[], micro: number) {
  const answers = Object.assign({}, ...jobs.map((j) => (j as unknown as { answers: Record<string, string> }).answers));
  const sent: string[][] = [];
  const send: Send<string> = async (batch) => {
    sent.push(batch.map((b) => b.customId));
    return { batchId: `b${sent.length}`, replies: batch.map((b) => ({ customId: b.customId, ok: true as const, value: answers[b.customId], micro, usage: { input: 1, output: 1 } })) };
  };
  return { send, sent };
}

describe("capMicroUsd", () => {
  it("defaults to the ceiling and never rises above it", () => {
    expect(capMicroUsd(undefined, undefined)).toBe(PRECON_OVERVIEW_CAP_USD * 1e6);
    expect(capMicroUsd("100", undefined)).toBe(15_000_000);
    expect(capMicroUsd(undefined, 1000)).toBe(15_000_000);
    expect(capMicroUsd("3", undefined)).toBe(3_000_000);
    expect(capMicroUsd("100", 2)).toBe(2_000_000);
  });

  it("refuses a value that is not a dollar amount", () => {
    expect(() => capMicroUsd("lots", undefined)).toThrow(/dollar amount/);
    expect(() => capMicroUsd(undefined, -1)).toThrow(/dollar amount/);
  });
});

describe("worstMicroUsd", () => {
  it("prices the counted input and the whole output ceiling at batch rates", () => {
    // Sonnet 5.5: $2 in, $10 out per million, halved in a batch.
    expect(worstMicroUsd("claude-sonnet-5-5", 20_000, 16_000)).toBe(20_000 * 1 + 16_000 * 5);
  });
});

describe("takeWithinCap", () => {
  it("takes the longest prefix whose worst case fits beside what was spent", () => {
    const q = [{ worstMicro: 4 }, { worstMicro: 4 }, { worstMicro: 4 }];
    expect(takeWithinCap(q, 0, 10).take).toHaveLength(2);
    expect(takeWithinCap(q, 3, 10).take).toHaveLength(1);
    expect(takeWithinCap(q, 7, 10).take).toHaveLength(0);
  });
});

describe("runBuild", () => {
  it("stores what passed, repairs what was refused once, and never sends past the cap", async () => {
    const jobs = [job("a", 100, "ok"), job("b", 100, "refused", "ok"), job("c", 100, "refused", "refused")];
    const { send, sent } = sender(jobs, 40);
    const stored: string[] = [];
    const r = await runBuild({ jobs, send, capMicro: 1_000, store: async (s) => { stored.push(s.file); }, log: () => {} });
    expect(sent).toEqual([["a", "b", "c"], ["b-r", "c-r"]]);
    expect(stored).toEqual(["a", "b"]);
    expect(r.failed).toEqual([{ file: "c", reason: "refused after the repair: overview" }]);
    expect(r.spentMicro).toBe(5 * 40);
    // A repaired precon carries both calls' cost.
    expect(r.stored.find((s) => s.file === "b")?.micro).toBe(80);
  });

  it("stops at the cap by the WORST case, even when replies come in cheap, and defers the rest", async () => {
    const jobs = [job("a", 400, "ok"), job("b", 400, "ok"), job("c", 400, "ok")];
    const { send, sent } = sender(jobs, 1);
    // 1,000 holds two worst cases at a time: the first batch sends a and b and spends 2. The second
    // then has 998 of room, which holds c's 400.
    const r = await runBuild({ jobs, send, capMicro: 1_000, store: async () => {}, log: () => {} });
    expect(sent).toEqual([["a", "b"], ["c"]]);
    expect(r.deferred).toEqual([]);

    const tight = await runBuild({ jobs, send: sender(jobs, 300).send, capMicro: 1_000, store: async () => {}, log: () => {} });
    // a and b cost 600, leaving 400: c's 400 fits exactly. Under a 900 cap it would not.
    expect(tight.deferred).toEqual([]);
    const under = await runBuild({ jobs, send: sender(jobs, 300).send, capMicro: 900, store: async () => {}, log: () => {} });
    expect(under.deferred).toEqual(["c"]);
    expect(under.spentMicro).toBeLessThanOrEqual(900);
  });

  it("a precon whose repair cannot be prepared fails alone, and the rest of the paid batch is still stored", async () => {
    const broken = { ...job("a", 100, "refused"), repair: async (): Promise<Outgoing> => { throw new Error("count_tokens 503"); } } as Job<string>;
    const jobs = [broken, job("b", 100, "ok")];
    const { send } = sender(jobs, 1);
    const stored: string[] = [];
    const r = await runBuild({ jobs, send, capMicro: 1_000, store: async (s) => { stored.push(s.file); }, log: () => {} });
    expect(stored).toEqual(["b"]);
    expect(r.failed).toEqual([{ file: "a", reason: "first answer could not be handled: count_tokens 503" }]);
  });

  it("sends a first answer the stages checks name (extra) to the one repair, then settles what it stores", async () => {
    const settled: string[] = [];
    const j = { ...job("a", 100, "ok"), extra: (_c: CheckedSynopsis, v: string) => (v === "ok" ? ["keyCards" as const] : []), settle: (c: CheckedSynopsis) => { settled.push("x"); return c; } } as Job<string>;
    const { send, sent } = sender([j], 1);
    const stored: string[] = [];
    const r = await runBuild({ jobs: [j], send, capMicro: 1_000, store: async (s) => { stored.push(s.file); }, log: () => {} });
    // The first answer passed the validator but extra names keyCards, so it is repaired once; the repair's answer is "ok" too, and extra is not asked again.
    expect(sent).toEqual([["a"], ["a-r"]]);
    expect(stored).toEqual(["a"]);
    expect(settled).toEqual(["x"]);
    expect(r.failed).toEqual([]);
  });

  it("stores the first answer when its advisory-only repair does not come back", async () => {
    const j = { ...job("a", 100, "ok"), extra: () => ["keyCards" as const], settle: (c: CheckedSynopsis) => c } as Job<string>;
    const send: Send<string> = async (batch) => ({
      batchId: "b",
      replies: batch.map((b) => (b.customId === "a"
        ? { customId: b.customId, ok: true as const, value: "ok", micro: 5, usage: { input: 1, output: 1 } }
        : { customId: b.customId, ok: false as const, reason: "errored", micro: 0, usage: { input: 0, output: 0 } })),
    });
    const stored: { file: string; micro: number }[] = [];
    const r = await runBuild({ jobs: [j], send, capMicro: 1_000, store: async (s) => { stored.push({ file: s.file, micro: s.micro }); }, log: () => {} });
    expect(stored).toEqual([{ file: "a", micro: 5 }]);
    expect(r.failed).toEqual([]);
  });

  it("stores the first answer when its advisory-only repair cannot be prepared", async () => {
    const j = { ...job("a", 100, "ok"), extra: () => ["keyCards" as const], settle: (c: CheckedSynopsis) => c, repair: async () => { throw new Error("count_tokens 503"); } } as Job<string>;
    const { send } = sender([j], 1);
    const stored: string[] = [];
    const r = await runBuild({ jobs: [j], send, capMicro: 1_000, store: async (s) => { stored.push(s.file); }, log: () => {} });
    expect(stored).toEqual(["a"]);
    expect(r.failed).toEqual([]);
  });

  it("fails a precon whose settled content has a refused section, and stores nothing for it", async () => {
    const j = { ...job("a", 100, "ok"), settle: () => refused() } as Job<string>;
    const { send } = sender([j], 1);
    const stored: string[] = [];
    const r = await runBuild({ jobs: [j], send, capMicro: 1_000, store: async (s) => { stored.push(s.file); }, log: () => {} });
    expect(stored).toEqual([]);
    expect(r.failed).toEqual([{ file: "a", reason: "refused: overview" }]);
  });

  it("sends nothing when not one request fits", async () => {
    const jobs = [job("a", 2_000, "ok")];
    const { send, sent } = sender(jobs, 1);
    const r = await runBuild({ jobs, send, capMicro: 1_000, store: async () => {}, log: () => {} });
    expect(sent).toEqual([]);
    expect(r.deferred).toEqual(["a"]);
  });
});
