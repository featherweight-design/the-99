import { describe, expect, it, vi } from "vitest";
import {
  buildRefusal, handCloseReport, INDEX_FINAL_PHASE, INDEX_SWEEP_PHASE, labelsDetail, labelsOf, phaseReport, recordBuild,
  STAPLES_LOOKBACK, staplesBase, type BuildRow,
} from "./builds";

const done = { ok: true, finishedAt: new Date(), catalogFingerprint: "10:a" };

describe("buildRefusal", () => {
  it("allows a finished, successful build whose catalog both sides still hold", () => {
    expect(buildRefusal(done, "10:a", "10:a")).toBeNull();
  });
  it("refuses when there is no build", () => {
    expect(buildRefusal(null, "10:a", "10:a")).toMatch(/no build/);
  });
  it("refuses an unfinished build", () => {
    expect(buildRefusal({ ...done, ok: null, finishedAt: null }, "10:a", "10:a")).toMatch(/not finished/);
  });
  it("refuses a failed build", () => {
    expect(buildRefusal({ ...done, ok: false }, "10:a", "10:a")).toMatch(/failed/);
  });
  it("refuses when the source's catalog moved since the build", () => {
    expect(buildRefusal(done, "10:b", "10:b")).toMatch(/moved since the build/);
  });
  it("refuses when the target's catalog differs", () => {
    expect(buildRefusal(done, "10:a", "10:c")).toMatch(/catalogs disagree/);
  });
});

describe("recordBuild", () => {
  const ledger = () => {
    const calls: string[] = [];
    const start = vi.fn(async () => { calls.push("start"); return { id: "b1" } as BuildRow; });
    const finish = vi.fn(async (_db: unknown, id: string, kind: string, ok: boolean) => {
      calls.push(`finish ${id} ${kind} ${ok ? "ok" : "failed"}`);
      return {} as BuildRow;
    });
    return { calls, deps: { start, finish } as never };
  };

  it("starts before the run and finishes ok after it", async () => {
    const { calls, deps } = ledger();
    const r = await recordBuild({} as never, "combos", async () => { calls.push("run"); return 3; }, () => null, deps);
    expect(r).toBe(3);
    expect(calls).toEqual(["start", "run", "finish b1 combos ok"]);
  });

  // The point of recording in the builder: a run that dies leaves its own row, failed, as the
  // newest, so an older ok can never vouch for tables that moved after it.
  it("finishes a run that throws as failed, and rethrows", async () => {
    const { calls, deps } = ledger();
    await expect(recordBuild({} as never, "combos", async () => { throw new Error("variants broke"); }, () => null, deps))
      .rejects.toThrow("variants broke");
    expect(calls).toEqual(["start", "finish b1 combos failed"]);
  });

  // A catalog database migrations have not reached: the ingest still runs, unrecorded, rather
  // than failing before it starts. Any other ledger failure stops it.
  it("runs unrecorded when the ledger table does not exist yet", async () => {
    const run = vi.fn(async () => 5);
    const missing = Object.assign(new Error("wrapped"), { cause: { code: "42P01" } });
    const deps = { start: vi.fn(async () => { throw missing; }), finish: vi.fn() } as never;
    expect(await recordBuild({} as never, "combos", run, () => null, deps)).toBe(5);
    expect(run).toHaveBeenCalledOnce();
  });

  it("stops the build when recording fails for any other reason", async () => {
    const run = vi.fn(async () => 5);
    const deps = { start: vi.fn(async () => { throw Object.assign(new Error("denied"), { code: "42501" }); }), finish: vi.fn() } as never;
    await expect(recordBuild({} as never, "combos", run, () => null, deps)).rejects.toThrow("denied");
    expect(run).not.toHaveBeenCalled();
  });

  // The last step of a build vouches for the catalog its first step derived from.
  it("starts the row with an inherited fingerprint when one is given", async () => {
    const { deps } = ledger();
    await recordBuild({} as never, "index", async () => 1, () => null, deps, "35572:abc");
    expect((deps as { start: ReturnType<typeof vi.fn> }).start).toHaveBeenCalledWith({}, "index", "35572:abc");
  });
});

describe("the label fingerprint in a build's report", () => {
  const fp = "0123456789abcdef0123456789abcdef";

  it("reads back what the index step wrote, beside its phase and counts", () => {
    expect(labelsOf(phaseReport("index", `3300 commanders, 1700 pairs; ${labelsDetail(fp)}`))).toBe(fp);
  });

  it("reads back what the staples step inherited", () => {
    expect(labelsOf(phaseReport("staples", labelsDetail(fp)))).toBe(fp);
  });

  it("is null for a build that wrote no label targets, and for one older than the label pass", () => {
    expect(labelsOf(phaseReport("staples", labelsDetail(null)))).toBeNull();
    expect(labelsOf(phaseReport("staples"))).toBeNull();
    expect(labelsOf(null)).toBeNull();
  });
});

describe("staplesBase (the row db:build:staples derives from and inherits)", () => {
  const done = new Date("2026-11-08T10:00:00Z");
  const row = (report: string | null, ok: boolean | null = true, catalogFingerprint = "1:abc") =>
    ({ ok, finishedAt: ok === null ? null : done, report, catalogFingerprint });
  // What `recordBuild` writes for a staples step that threw.
  const failedStaples = row(phaseReport(INDEX_FINAL_PHASE, "failed: composition refused"), false, "9:never");
  const index = row(phaseReport(INDEX_SWEEP_PHASE, "3300 commanders, 1700 pairs; labels=none"), true, "2:built");

  it("is the newest ok row", () => {
    expect(staplesBase([index])).toEqual({ base: index });
  });

  it("retries staples after a failed staples step, inheriting the ok index step beneath it", () => {
    expect(staplesBase([failedStaples, failedStaples, index])).toEqual({ base: index });
  });

  // A staples step KILLED by the job's timeout: its row was stamped when it started, so it is known.
  // Open, it refuses and says how to close it (it may still be writing); closed by hand, it keeps the
  // stamp and the retry looks past it.
  it("names a killed staples step, and looks past it once it is closed by hand", () => {
    const killed = { ok: null, finishedAt: null, report: phaseReport(INDEX_FINAL_PHASE, "started"), catalogFingerprint: "9:x" };
    expect(staplesBase([killed, index])).toMatchObject({ refusal: expect.stringMatching(/^a staples step has not finished .*db:catalog-build finish index failed/) });
    const closed = row(handCloseReport(killed.report, "killed at the job's timeout"), false, "9:x");
    expect(closed.report).toBe("phase=staples; closed by hand: killed at the job's timeout");
    expect(staplesBase([closed, index])).toEqual({ base: index });
  });

  it("refuses over a failed index step, even beneath a failed staples step", () => {
    const ok = row(phaseReport(INDEX_FINAL_PHASE));
    expect(staplesBase([row("index build threw", false), ok])).toEqual({ refusal: "an index build step failed (unmarked) with no ok step after it" });
    expect(staplesBase([failedStaples, row(phaseReport(INDEX_SWEEP_PHASE, "failed: x"), false), ok])).toEqual({ refusal: "an index build step failed (index) with no ok step after it" });
  });

  // THE TIMED-OUT SWEEP. Killed, its row keeps the `index` stamp its start wrote and refuses; closed by
  // hand it keeps that stamp too, so the older ok row's fingerprints are never handed to a staples run
  // over the lists the sweep half-replaced.
  it("refuses over a killed index step, open or closed by hand", () => {
    const older = row(phaseReport(INDEX_FINAL_PHASE), true, "1:older");
    const killed = { ok: null, finishedAt: null, report: phaseReport(INDEX_SWEEP_PHASE, "started"), catalogFingerprint: "2:timedout" };
    expect(staplesBase([killed, older])).toEqual({ refusal: "an index build step (index) has not finished (killed, or still running); close it, then rebuild the index" });
    expect(staplesBase([failedStaples, killed, older])).toMatchObject({ refusal: expect.stringMatching(/\(index\) has not finished/) });
    expect(staplesBase([row(handCloseReport(killed.report, "timed out"), false), older])).toEqual({ refusal: "an index build step failed (index) with no ok step after it" });
    expect(staplesBase([row(null, false), older])).toEqual({ refusal: "an index build step failed (unmarked) with no ok step after it" });
  });

  // A STAPLES-ONLY LEDGER: an ok staples row is a base like any ok row (a staples re-run over a whole
  // build); only failed staples rows is no baseline; a window of them says the window ran out.
  it("decides a staples-only ledger explicitly", () => {
    const okStaples = row(phaseReport(INDEX_FINAL_PHASE, "labels=none"));
    expect(staplesBase([okStaples])).toEqual({ base: okStaples });
    expect(staplesBase([failedStaples, failedStaples])).toEqual({ refusal: "no baseline: the ledger holds only failed staples steps; run db:build:index first" });
    expect(staplesBase(Array.from({ length: STAPLES_LOOKBACK }, () => failedStaples)))
      .toEqual({ refusal: `every one of the newest ${STAPLES_LOOKBACK} index rows is a failed staples step; no ok step was found within the window` });
  });

  it("refuses an empty ledger", () => {
    expect(staplesBase([])).toEqual({ refusal: "the ledger records no index build" });
  });
});

describe("recordBuild's phase", () => {
  it("stamps the row at its start and a failed row at its finish, so the ledger can say which step it was", async () => {
    const start = vi.fn(async () => ({ id: "b1" }) as BuildRow);
    const finish = vi.fn(async () => ({}) as BuildRow);
    await expect(recordBuild({} as never, "index", async () => { throw new Error("boom"); }, () => null, { start, finish }, "1:abc", INDEX_FINAL_PHASE))
      .rejects.toThrow("boom");
    expect(start).toHaveBeenCalledWith({}, "index", "1:abc", INDEX_FINAL_PHASE);
    expect(finish).toHaveBeenCalledWith({}, "b1", "index", false, "phase=staples; failed: boom");
  });

  it("keeps the bare error with no phase", async () => {
    const start = vi.fn(async () => ({ id: "b1" }) as BuildRow);
    const finish = vi.fn(async () => ({}) as BuildRow);
    await expect(recordBuild({} as never, "index", async () => { throw new Error("boom"); }, () => null, { start, finish })).rejects.toThrow("boom");
    expect(finish).toHaveBeenCalledWith({}, "b1", "index", false, "boom");
  });
});

// The phase is written by CODE only: a hand close keeps the start's stamp and can never type one.
describe("handCloseReport", () => {
  it("keeps the phase the row's start stamped, before the closer's note", () => {
    expect(handCloseReport(phaseReport(INDEX_FINAL_PHASE, "started"), "killed")).toBe("phase=staples; closed by hand: killed");
    expect(handCloseReport(phaseReport(INDEX_SWEEP_PHASE, "started"), null)).toBe("phase=index; closed by hand");
  });

  it("leaves an unstamped row's report as the closer wrote it", () => {
    expect(handCloseReport(null, "bracketed by hand")).toBe("bracketed by hand");
    expect(handCloseReport(null, null)).toBeNull();
  });

  it("refuses a closer's report that begins with the phase marker, however it is spelled", () => {
    for (const text of ["phase=staples", " phase=staples; ok", "PHASE = staples"]) {
      expect(() => handCloseReport(phaseReport(INDEX_SWEEP_PHASE, "started"), text)).toThrow(/may not begin with phase=/);
    }
  });
});

// The staples retry looks past failed rows; the COPY never does. It reads the newest row alone.
describe("the copy still refuses while the newest index row is failed", () => {
  it("a failed staples row", () => {
    const failed = { ok: false, finishedAt: new Date(), catalogFingerprint: "1:abc", report: phaseReport(INDEX_FINAL_PHASE, "failed: x") };
    expect(buildRefusal(failed, "1:abc", "1:abc")).toBe("the source's newest build failed");
  });
});
