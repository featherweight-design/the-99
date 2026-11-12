import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("../../../../lib/precons/upgrade/actions", () => ({ pressUpgradeAction: vi.fn(), readUpgradeAction: vi.fn() }));
const { useLinePulse } = await import("./use-upgrade-run");

const el = () => ({ current: document.createElement("button") });

// The first-sight trigger: an IntersectionObserver stub the test fires by hand.
let fire: (() => void) | null = null;
class SeenOnce {
  constructor(private cb: (e: { isIntersecting: boolean }[]) => void) { fire = () => this.cb([{ isIntersecting: true }]); }
  observe() {}
  disconnect() {}
}

describe("useLinePulse's replay (addendum A3, G21)", () => {
  beforeEach(() => { vi.useFakeTimers(); fire = null; });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("plays nothing until a bump, then twice per bump, as the first time", async () => {
    const ref = el();
    const { result, rerender } = renderHook(({ n }) => useLinePulse(ref, n), { initialProps: { n: 0 } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current).toBe(0);
    rerender({ n: 1 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(560); });
    expect(result.current).toBe(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current).toBe(2);
    rerender({ n: 2 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current).toBe(3);
    await act(async () => { await vi.advanceTimersByTimeAsync(560); });
    expect(result.current).toBe(4);
  });

  it("keeps the once-a-visit first sight, and a bump after it plays twice more", async () => {
    vi.stubGlobal("IntersectionObserver", SeenOnce);
    const ref = el();
    const { result, rerender } = renderHook(({ n }) => useLinePulse(ref, n), { initialProps: { n: 0 } });
    act(() => fire?.());
    await act(async () => { await vi.advanceTimersByTimeAsync(560); });
    expect(result.current).toBe(2);
    // Seen again: still once a visit.
    act(() => fire?.());
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(result.current).toBe(2);
    rerender({ n: 1 });
    await act(async () => { await vi.advanceTimersByTimeAsync(561); });
    expect(result.current).toBe(4);
  });

  it("a rerender with the same count plays nothing", async () => {
    const ref = el();
    const { result, rerender } = renderHook(({ n }) => useLinePulse(ref, n), { initialProps: { n: 3 } });
    rerender({ n: 3 });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current).toBe(0);
  });
});
