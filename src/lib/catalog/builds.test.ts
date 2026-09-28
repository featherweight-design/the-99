import { describe, expect, it, vi } from "vitest";
import { buildRefusal, recordBuild, type BuildRow } from "./builds";

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
});
