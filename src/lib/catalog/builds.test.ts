import { describe, expect, it, vi } from "vitest";
import { buildRefusal, labelsDetail, labelsOf, phaseReport, recordBuild, type BuildRow } from "./builds";

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
