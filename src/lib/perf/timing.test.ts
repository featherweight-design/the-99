import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `after` runs its callback at once, standing in for "the response has finished".
const afters = vi.fn((fn: () => void) => fn());
vi.mock("next/server", () => ({ after: (fn: () => void) => afters(fn) }));

const { perfRoute } = await import("./timing");

describe("perfRoute", () => {
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    afters.mockReset();
    afters.mockImplementation((fn: () => void) => fn());
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is a bare pass-through with PERF_TIMING unset: one shared tracker, the same promise, no clock, no line", async () => {
    vi.stubEnv("PERF_TIMING", "");
    const clock = vi.spyOn(performance, "now");
    const a = perfRoute("/decks");
    const b = perfRoute("/");
    // One frozen object for every request: nothing is allocated per request or per span.
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    const promise = Promise.resolve(7);
    expect(a.timed("read", () => promise)).toBe(promise);
    await promise;
    expect(clock).not.toHaveBeenCalled();
    expect(afters).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("logs the route pattern, the labels and milliseconds, once the request has finished", async () => {
    vi.stubEnv("PERF_TIMING", "1");
    let finish!: () => void;
    afters.mockImplementationOnce((fn) => { finish = fn; });
    const perf = perfRoute("/decks/[id]");
    await perf.timed("getDeckDetail", async () => "detail");
    await perf.timed("wave1", async () => 1);
    expect(log).not.toHaveBeenCalled();
    finish();
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toMatch(/^\[perf\] \/decks\/\[id\] total=\d+ getDeckDetail=\d+ wave1=\d+$/);
  });

  it("keeps two requests' spans apart", async () => {
    vi.stubEnv("PERF_TIMING", "1");
    const finishes: (() => void)[] = [];
    afters.mockImplementation((fn) => { finishes.push(fn); });
    const one = perfRoute("/api/card-detail");
    const two = perfRoute("/api/card-detail");
    await one.timed("auth", async () => 1);
    await two.timed("loadCardDetail", async () => 2);
    finishes.forEach((f) => f());
    expect(String(log.mock.calls[0][0])).toMatch(/ auth=\d+$/);
    expect(String(log.mock.calls[1][0])).toMatch(/ loadCardDetail=\d+$/);
  });

  it("still records a span whose read throws, and rethrows it", async () => {
    vi.stubEnv("PERF_TIMING", "1");
    let finish!: () => void;
    afters.mockImplementationOnce((fn) => { finish = fn; });
    const perf = perfRoute("/");
    await expect(perf.timed("broken", async () => { throw new Error("x"); })).rejects.toThrow("x");
    finish();
    expect(String(log.mock.calls[0][0])).toMatch(/ broken=\d+$/);
  });
});
