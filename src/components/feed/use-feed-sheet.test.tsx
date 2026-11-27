import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useFeedSheet, type SheetPlace } from "./use-feed-sheet";

const at: SheetPlace = { key: "combo-1", scroll: 412, kind: "combo" };

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tick = () => act(() => void vi.advanceTimersByTime(1));

describe("useFeedSheet", () => {
  it("opens the sheet again, at the place it was left, when the combo it gave way to is closed", () => {
    const { result } = renderHook(() => useFeedSheet());
    act(() => result.current.show());
    expect(result.current.open).toBe(true);
    act(() => result.current.giveWay(at));
    tick();
    expect(result.current.open).toBe(false);
    act(() => result.current.comboClosed());
    tick();
    expect(result.current.open).toBe(true);
    expect(result.current.place).toEqual(at);
  });

  it("does not open the sheet when a combo closes that the sheet did not give way to", () => {
    const { result } = renderHook(() => useFeedSheet());
    act(() => result.current.comboClosed());
    tick();
    expect(result.current.open).toBe(false);
    // Nor a second time: the return is spent by the first close.
    act(() => result.current.show());
    act(() => result.current.giveWay(at));
    tick();
    act(() => result.current.comboClosed());
    tick();
    act(() => result.current.close());
    act(() => result.current.comboClosed());
    tick();
    expect(result.current.open).toBe(false);
  });

  it("forgets the place when the sheet is opened or closed any other way, so a late combo close brings nothing back", () => {
    const { result } = renderHook(() => useFeedSheet());
    act(() => result.current.giveWay(at));
    tick();
    act(() => result.current.show());
    act(() => result.current.close());
    act(() => result.current.comboClosed());
    tick();
    expect(result.current.open).toBe(false);
    expect(result.current.place).toBeNull();
  });

  it("forgets the place when the page leaves, so the sheet never opens over another page", () => {
    const { result, unmount } = renderHook(() => useFeedSheet());
    act(() => result.current.giveWay(at));
    tick();
    const { comboClosed } = result.current;
    unmount();
    comboClosed();
    vi.advanceTimersByTime(1);
    // The unmounted hook set nothing: its place was dropped by the unmount, so there was nothing to reopen.
    expect(result.current.open).toBe(false);
  });
});
