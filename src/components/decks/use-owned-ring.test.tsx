// The deck row's brief ring (add a card from anywhere, READINESS O9; D5, D-D3, S4, K7).
import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OWNED_RING_MS, useOwnedRing } from "./use-owned-ring";
import { forgetJustOwned, isJustOwned, JUST_OWNED_LAPSE_MS, noteJustOwned } from "../../lib/decks/just-owned";

beforeEach(() => {
  vi.useFakeTimers();
  forgetJustOwned("d1", "ghalta");
  forgetJustOwned("d2", "ghalta");
});
afterEach(() => vi.useRealTimers());

const ring = (owned: boolean, deckId = "d1") => renderHook(() => useOwnedRing(deckId, "ghalta", owned));

describe("useOwnedRing", () => {
  it("does not ring a row drawn owned or unowned from the start", () => {
    expect(ring(true).result.current).toBe(false);
    expect(ring(false).result.current).toBe(false);
  });

  it("rings when the dot fills under the row, then lets go (D5, S4)", () => {
    const { result, rerender } = renderHook(({ owned }) => useOwnedRing("d1", "ghalta", owned), { initialProps: { owned: false } });
    rerender({ owned: true });
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(OWNED_RING_MS - 1));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("drops the ring with the dot on an Undo", () => {
    const { result, rerender } = renderHook(({ owned }) => useOwnedRing("d1", "ghalta", owned), { initialProps: { owned: false } });
    rerender({ owned: true });
    rerender({ owned: false });
    expect(result.current).toBe(false);
  });

  it("rings a row already on screen when the note arrives (the add's answer, K7), once", () => {
    const first = ring(true);
    expect(first.result.current).toBe(false);
    act(() => noteJustOwned("d1", "ghalta"));
    expect(first.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(OWNED_RING_MS));
    expect(first.result.current).toBe(false);
    expect(isJustOwned("d1", "ghalta")).toBe(false);
    expect(ring(true).result.current).toBe(false);
  });

  it("rings a row that mounts owned for a noted card", () => {
    noteJustOwned("d1", "ghalta");
    expect(ring(true).result.current).toBe(true);
  });

  it("never rings a row on another deck for the note", () => {
    noteJustOwned("d1", "ghalta");
    expect(ring(true, "d2").result.current).toBe(false);
    expect(isJustOwned("d1", "ghalta")).toBe(true);
  });

  it("hands the note to the row that stands in for one unmounted inside the window, then spends it (K4)", () => {
    noteJustOwned("d1", "ghalta");
    const first = ring(true);
    expect(first.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(OWNED_RING_MS / 2));
    first.unmount();
    // A regroup remounts the row: the new one rings what is left.
    expect(isJustOwned("d1", "ghalta")).toBe(true);
    const second = ring(true);
    expect(second.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(OWNED_RING_MS));
    expect(second.result.current).toBe(false);
    expect(isJustOwned("d1", "ghalta")).toBe(false);
  });

  it("still rings under Strict Mode's double mount, and spends the note once it has run (K3)", () => {
    noteJustOwned("d1", "ghalta");
    const strict = renderHook(() => useOwnedRing("d1", "ghalta", true), { wrapper: StrictMode });
    expect(strict.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(OWNED_RING_MS - 1));
    expect(strict.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(strict.result.current).toBe(false);
    expect(isJustOwned("d1", "ghalta")).toBe(false);
  });

  it("does not ring a row reused for another deck whose card is owned there (K2)", () => {
    const { result, rerender } = renderHook(({ deckId, owned }) => useOwnedRing(deckId, "ghalta", owned), {
      initialProps: { deckId: "d1", owned: false },
    });
    rerender({ deckId: "d2", owned: true });
    expect(result.current).toBe(false);
    // On the new deck, a real flip still rings.
    rerender({ deckId: "d2", owned: false });
    rerender({ deckId: "d2", owned: true });
    expect(result.current).toBe(true);
  });

  it("lapses in ten seconds, so a later view does not ring an add long done (K5)", () => {
    expect(JUST_OWNED_LAPSE_MS).toBe(10_000);
  });

  it("does not ring an unowned row for a noted card, and a note lapses on its own", () => {
    noteJustOwned("d1", "ghalta");
    expect(ring(false).result.current).toBe(false);
    act(() => vi.advanceTimersByTime(JUST_OWNED_LAPSE_MS - 1));
    expect(isJustOwned("d1", "ghalta")).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(isJustOwned("d1", "ghalta")).toBe(false);
  });
});
