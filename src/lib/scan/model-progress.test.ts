import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { holdModelLoad, PROGRESS_EVERY_MS, resetModelLoad, scanModelLoad, trackModelFile } from "./model-progress";

const net = (loaded: number, keeps = true) => ({ from: "network" as const, loaded, total: 100, keeps });

beforeEach(() => {
  vi.useFakeTimers();
  resetModelLoad();
});
afterEach(() => {
  resetModelLoad();
  vi.useRealTimers();
});

describe("the scanner's model load store", () => {
  it("drops the reports of a file's load once a newer load of that file replaced it", () => {
    const old = trackModelFile("detector");
    old.report(net(0));
    trackModelFile("detector");
    old.report(net(0));
    old.report(net(90));
    old.settle(true);
    expect(scanModelLoad.get()!.files.detector).toMatchObject({ loaded: 0, done: false, failed: false });
  });

  it("throttles byte counts to one publish per PROGRESS_EVERY_MS, then publishes the latest on a trailing timer", () => {
    const t = trackModelFile("embedder");
    const seen = vi.fn();
    const off = scanModelLoad.subscribe(seen);
    t.report(net(0)); // a download starting: told at once
    expect(seen).toHaveBeenCalledTimes(1);
    t.report(net(10));
    t.report(net(20));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(scanModelLoad.get()!.files.embedder.loaded).toBe(0);
    vi.advanceTimersByTime(PROGRESS_EVERY_MS);
    expect(seen).toHaveBeenCalledTimes(2);
    expect(scanModelLoad.get()!.files.embedder.loaded).toBe(20);
    off();
  });

  it("marks a failed load failed, never done, and keeps it in view while a scanner holds it", () => {
    const release = holdModelLoad();
    const t = trackModelFile("detector");
    trackModelFile("embedder").settle(false);
    t.report(net(40));
    t.settle(false);
    expect(scanModelLoad.get()!.files.detector).toMatchObject({ done: false, failed: true, loaded: 40 });
    release();
    expect(scanModelLoad.get()).toBeNull();
  });

  it("keeps a finished load while a scanner holds it (loading L2), and lets it go when the scanner closes", () => {
    const release = holdModelLoad();
    for (const name of ["detector", "embedder"] as const) {
      const t = trackModelFile(name);
      t.report(net(100));
      t.settle(true);
    }
    expect(scanModelLoad.get()!.files.embedder.done).toBe(true);
    release();
    expect(scanModelLoad.get()).toBeNull();
  });

  it("restarts a file that was downloading as a download at 0, so a retry never reads as a cached open", () => {
    const t = trackModelFile("detector");
    t.report(net(60));
    t.settle(false);
    trackModelFile("detector");
    expect(scanModelLoad.get()!.files.detector).toMatchObject({ from: "network", loaded: 0, total: 100, failed: false });
  });

  it("is cacheless when a download can't be kept in Cache Storage", () => {
    trackModelFile("detector").report(net(0, false));
    expect(scanModelLoad.get()!.cacheless).toBe(true);
    resetModelLoad();
    trackModelFile("detector").report(net(0, true));
    expect(scanModelLoad.get()!.cacheless).toBe(false);
  });
});
