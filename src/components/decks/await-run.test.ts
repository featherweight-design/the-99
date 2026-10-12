import { afterEach, describe, expect, it, vi } from "vitest";

import { awaitRunSettled } from "./await-run";

afterEach(() => vi.useRealTimers());

const pending = { run: { id: "r1", status: "pending" } };
const ok = { run: { id: "r1", status: "ok" } };

describe("awaitRunSettled", () => {
  it("reads until the run it started is no longer pending", async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(pending).mockResolvedValueOnce(ok);
    const done = awaitRunSettled(read, "r1", { pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await done).toBe(ok);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("returns at once for a run that already settled, or is gone from the read", async () => {
    expect(await awaitRunSettled(async () => ok, "r1")).toBe(ok);
    const other = { run: { id: "r2", status: "pending" } };
    expect(await awaitRunSettled(async () => other, "r1")).toBe(other);
    expect(await awaitRunSettled(async () => ({ run: null }), "r1")).toEqual({ run: null });
  });

  it("ends on a failed read, on an abort, and at its ceiling with the run still pending", async () => {
    expect(await awaitRunSettled(async () => { throw new Error("x"); }, "r1")).toBeNull();
    const read = vi.fn(async () => pending);
    expect(await awaitRunSettled(read, "r1", { aborted: () => true })).toBe(pending);
    expect(read).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    let t = 0;
    const capped = awaitRunSettled(async () => pending, "r1", { pollMs: 1000, maxMs: 3000, now: () => t });
    for (let i = 0; i < 5; i += 1) { t += 1000; await vi.advanceTimersByTimeAsync(1000); }
    expect(await capped).toBe(pending);
  });
});
