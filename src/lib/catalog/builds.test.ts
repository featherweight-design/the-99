import { describe, expect, it, vi } from "vitest";
import {
  buildRefusal, INDEX_FINAL_PHASE, labelsDetail, labelsOf, phaseReport, recordBuild, staplesBase, type BuildRow,
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
  // What `recordBuild` writes for a staples step that threw (`failurePhase`).
  const failedStaples = row(phaseReport(INDEX_FINAL_PHASE, "failed: composition refused"), false, "9:never");

  it("is the newest ok row", () => {
    const index = row(phaseReport("index"));
    expect(staplesBase([index])).toEqual({ base: index });
  });

  it("retries staples after a failed staples step, inheriting the ok index step beneath it", () => {
    const index = row(phaseReport("index", "3300 commanders, 1700 pairs; labels=none"), true, "2:built");
    expect(staplesBase([failedStaples, failedStaples, index])).toEqual({ base: index });
  });

  it("refuses over a failed index step, even beneath a failed staples step", () => {
    const ok = row(phaseReport(INDEX_FINAL_PHASE));
    expect(staplesBase([row("index build threw", false), ok])).toEqual({ refusal: "an index build step failed (unmarked) with no ok step after it" });
    expect(staplesBase([failedStaples, row(phaseReport("index", "failed: x"), false), ok])).toEqual({ refusal: "an index build step failed (index) with no ok step after it" });
  });

  // THE TIMED-OUT BUILD. A killed step never closes its row, so it carries no phase. Unfinished, it
  // refuses; closed BY HAND as failed, it carries whatever report its closer gave it, and without the
  // staples stamp it still refuses, so the older ok row's fingerprints are never handed to staples
  // over the lists the timed-out build half-replaced.
  it("refuses over an unfinished row, and over one later closed by hand without the staples stamp", () => {
    const older = row(phaseReport(INDEX_FINAL_PHASE), true, "1:older");
    const unfinished = { ok: null, finishedAt: null, report: null, catalogFingerprint: "2:timedout" };
    expect(staplesBase([unfinished, older])).toEqual({ refusal: "an index build step has not finished (killed or still running); close it, then rebuild the index" });
    expect(staplesBase([failedStaples, unfinished, older])).toMatchObject({ refusal: expect.stringMatching(/has not finished/) });
    expect(staplesBase([row(null, false), older])).toEqual({ refusal: "an index build step failed (unmarked) with no ok step after it" });
    expect(staplesBase([row("timed out at 170 minutes", false), older])).toMatchObject({ refusal: expect.stringMatching(/failed \(unmarked\)/) });
  });

  it("refuses an empty ledger", () => {
    expect(staplesBase([])).toEqual({ refusal: "the ledger records no index build" });
  });
});

describe("recordBuild's failure phase", () => {
  it("stamps a failed row with the step's phase, so the ledger can say which step failed", async () => {
    const start = vi.fn(async () => ({ id: "b1" }) as BuildRow);
    const finish = vi.fn(async () => ({}) as BuildRow);
    await expect(recordBuild({} as never, "index", async () => { throw new Error("boom"); }, () => null, { start, finish }, "1:abc", INDEX_FINAL_PHASE))
      .rejects.toThrow("boom");
    expect(finish).toHaveBeenCalledWith({}, "b1", "index", false, "phase=staples; failed: boom");
  });

  it("keeps the bare error with no failure phase", async () => {
    const start = vi.fn(async () => ({ id: "b1" }) as BuildRow);
    const finish = vi.fn(async () => ({}) as BuildRow);
    await expect(recordBuild({} as never, "index", async () => { throw new Error("boom"); }, () => null, { start, finish })).rejects.toThrow("boom");
    expect(finish).toHaveBeenCalledWith({}, "b1", "index", false, "boom");
  });
});

// The staples retry looks past failed rows; the COPY never does. It reads the newest row alone.
describe("the copy still refuses while the newest index row is failed", () => {
  it("a failed staples row", () => {
    const failed = { ok: false, finishedAt: new Date(), catalogFingerprint: "1:abc", report: phaseReport(INDEX_FINAL_PHASE, "failed: x") };
    expect(buildRefusal(failed, "1:abc", "1:abc")).toBe("the source's newest build failed");
  });
});
