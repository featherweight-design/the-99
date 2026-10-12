import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deckAnalyzed, holdsOpening, isOpening, OPENING_CEILING_MS, OPENING_DELAY_MS, OPENING_HOLD_MS, useOpenOnce, useOpeningGate } from "./use-opening-gate";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("useOpeningGate", () => {
  it("is off while nothing is being fetched", () => {
    const { result } = renderHook(({ active }) => useOpeningGate(active, "d1"), { initialProps: { active: false } });
    expect(result.current).toBe("off");
  });

  // A fast fetch goes straight to the answer: no loader, not even for a frame.
  it("never draws the loader for a fetch that answers inside the delay", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active, "d1"), { initialProps: { active: true } });
    expect(result.current).toBe("wait");
    advance(OPENING_DELAY_MS - 10);
    rerender({ active: false });
    expect(result.current).toBe("off");
    advance(OPENING_DELAY_MS * 4);
    expect(result.current).toBe("off");
  });

  it("draws the loader once the delay passes", () => {
    const { result } = renderHook(({ active }) => useOpeningGate(active, "d1"), { initialProps: { active: true } });
    advance(OPENING_DELAY_MS);
    expect(result.current).toBe("loader");
  });

  // Once drawn it never blinks: the answer waits behind it until the hold has run.
  it("holds a drawn loader for the full hold, even when the fetch answers at once", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active, "d1"), { initialProps: { active: true } });
    advance(OPENING_DELAY_MS);
    rerender({ active: false });
    expect(result.current).toBe("loader");
    advance(OPENING_HOLD_MS - 10);
    expect(result.current).toBe("loader");
    advance(10);
    expect(result.current).toBe("off");
  });

  it("releases at once when the fetch outlasted the hold", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active, "d1"), { initialProps: { active: true } });
    advance(OPENING_DELAY_MS + OPENING_HOLD_MS + 200);
    rerender({ active: false });
    advance(0);
    expect(result.current).toBe("off");
  });

  // Turned on by a render (the tab opening), never a frame late: the flash lives in that frame.
  it("is waiting in the very render that starts the fetch", () => {
    const { result, rerender } = renderHook(({ active }) => useOpeningGate(active, "d1"), { initialProps: { active: false } });
    rerender({ active: true });
    expect(result.current).toBe("wait");
  });
});

describe("useOpeningGate across a deck change", () => {
  const useGate = (props: { active: boolean; deckId: string }) => useOpeningGate(props.active, props.deckId);

  it("starts the next deck's delay from zero rather than inheriting the last one's", () => {
    const { result, rerender } = renderHook(useGate, { initialProps: { active: true, deckId: "a" } });
    advance(OPENING_DELAY_MS - 20);
    rerender({ active: true, deckId: "b" });
    advance(40);
    expect(result.current).toBe("wait");
    advance(OPENING_DELAY_MS);
    expect(result.current).toBe("loader");
  });

  it("drops a held loader for a next deck with nothing stored, at once", () => {
    const { result, rerender } = renderHook(useGate, { initialProps: { active: true, deckId: "a" } });
    advance(OPENING_DELAY_MS);
    expect(result.current).toBe("loader");
    rerender({ active: false, deckId: "b" });
    expect(result.current).toBe("off");
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

// Hugh's staging walk, 2026-09-25: the opening waits on everything the tab paints, not on the
// stored reading alone, and once a visit has opened nothing brings the loader back.
describe("what the opening waits on", () => {
  const all = { analyzed: true, peekPending: false, overviewSettled: true, hasReading: true, suggestionsSettled: true };

  it("lets go only once the reading, the overview and Suggested changes have all answered", () => {
    expect(holdsOpening(all)).toBe(false);
    expect(holdsOpening({ ...all, peekPending: true })).toBe(true);
    expect(holdsOpening({ ...all, overviewSettled: false })).toBe(true);
    // Proposed cuts holds an analyzed deck's opening even with no reading drawn on screen.
    expect(holdsOpening({ ...all, hasReading: false, cutsSettled: false })).toBe(true);
    expect(holdsOpening({ ...all, hasReading: false, cutsSettled: true })).toBe(false);
    expect(holdsOpening({ ...all, suggestionsSettled: false })).toBe(true);
  });

  // Hugh, 2026-10-11: a deck never analyzed has nothing to open, so its empty state draws at once.
  it("holds nothing for a deck that has never been analyzed, whatever else is still out", () => {
    expect(holdsOpening({ analyzed: false, peekPending: false, overviewSettled: false, hasReading: false, suggestionsSettled: false, cutsSettled: false })).toBe(false);
  });

  it("does not wait on Suggested changes where there is no reading, since none is drawn", () => {
    expect(holdsOpening({ ...all, hasReading: false, suggestionsSettled: false })).toBe(false);
  });

  it("gates a visit only until it first lets go, and a new visit opens afresh", () => {
    const { result, rerender } = renderHook(({ holding, visit }) => useOpenOnce(holding, visit, true), {
      initialProps: { holding: true, visit: "d:1" },
    });
    expect(result.current).toBe(true);
    rerender({ holding: false, visit: "d:1" });
    expect(result.current).toBe(false);
    // A press over the open tab (a reading landing, Suggested changes mounting) holds nothing.
    rerender({ holding: true, visit: "d:1" });
    expect(result.current).toBe(false);
    rerender({ holding: true, visit: "d:2" });
    expect(result.current).toBe(true);
  });

  it("opens a visit whose reads never answer once the ceiling passes", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useOpenOnce(true, "d:1", true));
      expect(result.current).toBe(true);
      act(() => { vi.advanceTimersByTime(OPENING_CEILING_MS); });
      expect(result.current).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // Leaving the tab while the loader is held, and coming back before its hold ends, must not
  // leave the loader up: the new visit's reads answering lets it go.
  it("lets go of a loader held across a leave and a re-entry, once the new visit's reads answer", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ holding, visit, shown }) => useOpeningGate(useOpenOnce(holding, visit, shown), "d"),
        { initialProps: { holding: true, visit: "d:1", shown: true } },
      );
      act(() => { vi.advanceTimersByTime(OPENING_DELAY_MS); });
      expect(result.current).toBe("loader");
      rerender({ holding: true, visit: "d:1", shown: false });
      act(() => { vi.advanceTimersByTime(OPENING_HOLD_MS / 4); });
      rerender({ holding: true, visit: "d:2", shown: true });
      expect(result.current).toBe("loader");
      rerender({ holding: false, visit: "d:2", shown: true });
      act(() => { vi.advanceTimersByTime(OPENING_HOLD_MS); });
      expect(result.current).toBe("off");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never gates a tab that is not shown", () => {
    const { result } = renderHook(() => useOpenOnce(true, "d:1", false));
    expect(result.current).toBe(false);
  });
});

describe("deckAnalyzed", () => {
  it("is false only when the stored read answered that there is none and nothing is on screen", () => {
    expect(deckAnalyzed({ storedPermits: null, hasReading: false, storedUnknown: false })).toBe(false);
    expect(deckAnalyzed({ storedPermits: [2, 3], hasReading: false, storedUnknown: false })).toBe(true);
    expect(deckAnalyzed({ storedPermits: null, hasReading: true, storedUnknown: false })).toBe(true);
  });

  it("keeps the hold when the stored read failed: a failure is not proof of no analysis", () => {
    expect(deckAnalyzed({ storedPermits: null, hasReading: false, storedUnknown: true })).toBe(true);
  });
});
