import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isOpening, OPENING_DELAY_MS, OPENING_HOLD_MS, useOpeningGate } from "./use-opening-gate";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("useOpeningGate", () => {
  it("is off while nothing is being fetched", () => {
    const { result } = renderHook(({ active }) => useOpeningGate(active), { initialProps: { active: false } });
    expect(result.current).toBe("off");
  });

  // A fast fetch goes straight to the answer: no loader, not even for a frame.
  it("never draws the loader for a fetch that answers inside the delay", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active), { initialProps: { active: true } });
    expect(result.current).toBe("wait");
    advance(OPENING_DELAY_MS - 10);
    rerender({ active: false });
    expect(result.current).toBe("off");
    advance(OPENING_DELAY_MS * 4);
    expect(result.current).toBe("off");
  });

  it("draws the loader once the delay passes", () => {
    const { result } = renderHook(({ active }) => useOpeningGate(active), { initialProps: { active: true } });
    advance(OPENING_DELAY_MS);
    expect(result.current).toBe("loader");
  });

  // Once drawn it never blinks: the answer waits behind it until the hold has run.
  it("holds a drawn loader for the full hold, even when the fetch answers at once", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active), { initialProps: { active: true } });
    advance(OPENING_DELAY_MS);
    rerender({ active: false });
    expect(result.current).toBe("loader");
    advance(OPENING_HOLD_MS - 10);
    expect(result.current).toBe("loader");
    advance(10);
    expect(result.current).toBe("off");
  });

  it("releases at once when the fetch outlasted the hold", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active), { initialProps: { active: true } });
    advance(OPENING_DELAY_MS + OPENING_HOLD_MS + 200);
    rerender({ active: false });
    advance(0);
    expect(result.current).toBe("off");
  });

  // Turned on by a render (the tab opening), never a frame late: the flash lives in that frame.
  it("is waiting in the very render that starts the fetch", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active), { initialProps: { active: false } });
    rerender({ active: true });
    expect(result.current).toBe("wait");
  });
});

describe("isOpening", () => {
  const base = { shown: true, kind: "idle", storedPermits: [3] as const, peekSettled: false };

  it("opens an analyzed deck's tab while its peek is out", () => {
    expect(isOpening(base)).toBe(true);
  });

  // The permits gate: no stored analysis, nothing to fetch, and "not analyzed" is the answer now.
  it("never holds back the empty state of a deck with no stored analysis", () => {
    expect(isOpening({ ...base, storedPermits: null })).toBe(false);
  });

  it("ends when the peek answers, the tab is left, or the state moves past idle", () => {
    expect(isOpening({ ...base, peekSettled: true })).toBe(false);
    expect(isOpening({ ...base, shown: false })).toBe(false);
    expect(isOpening({ ...base, kind: "loading" })).toBe(false);
    expect(isOpening({ ...base, kind: "ready" })).toBe(false);
  });
});
