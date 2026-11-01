// The deck row's brief ring (add a card from anywhere, READINESS O9; D5, D-D3, S4, K7).
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OWNED_RING_MS, useOwnedRing } from "./use-owned-ring";
import { forgetJustOwned, isJustOwned, JUST_OWNED_LAPSE_MS, noteJustOwned } from "../../lib/decks/just-owned";

beforeEach(() => {
  vi.useFakeTimers();
  forgetJustOwned("ghalta");
});
afterEach(() => vi.useRealTimers());

describe("useOwnedRing", () => {
  it("does not ring a row drawn owned or unowned from the start", () => {
    expect(renderHook(() => useOwnedRing("ghalta", true)).result.current).toBe(false);
    expect(renderHook(() => useOwnedRing("ghalta", false)).result.current).toBe(false);
  });

  it("rings when the dot fills under the row, then lets go (D5, S4)", () => {
    const { result, rerender } = renderHook(({ owned }) => useOwnedRing("ghalta", owned), { initialProps: { owned: false } });
    rerender({ owned: true });
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(OWNED_RING_MS - 1));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("drops the ring with the dot on an Undo", () => {
    const { result, rerender } = renderHook(({ owned }) => useOwnedRing("ghalta", owned), { initialProps: { owned: false } });
    rerender({ owned: true });
    rerender({ owned: false });
    expect(result.current).toBe(false);
  });

  it("rings a row that lands owned for a card the dock's bridge just saved, once (K7)", () => {
    noteJustOwned("ghalta");
    const first = renderHook(() => useOwnedRing("ghalta", true));
    expect(first.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(OWNED_RING_MS));
    expect(first.result.current).toBe(false);
    expect(isJustOwned("ghalta")).toBe(false);
    expect(renderHook(() => useOwnedRing("ghalta", true)).result.current).toBe(false);
  });

  it("does not ring an unowned row for a noted card, and a note lapses on its own", () => {
    noteJustOwned("ghalta", 1_000);
    expect(isJustOwned("ghalta", 1_000 + JUST_OWNED_LAPSE_MS)).toBe(true);
    expect(isJustOwned("ghalta", 1_001 + JUST_OWNED_LAPSE_MS)).toBe(false);
    noteJustOwned("ghalta");
    expect(renderHook(() => useOwnedRing("ghalta", false)).result.current).toBe(false);
  });
});
