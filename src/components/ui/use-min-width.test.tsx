import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsDesktop } from "./use-is-desktop";
import { useIsWide } from "./use-is-wide";
import { useMinWidth } from "./use-min-width";

/** A matchMedia that reports a viewport width and can be resized. */
function stubViewport(width: number) {
  const listeners = new Map<string, Set<() => void>>();
  let current = width;

  const matchesFor = (query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return current >= min;
  };

  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return matchesFor(query);
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, fn: () => void) => {
          const set = listeners.get(query) ?? new Set();
          set.add(fn);
          listeners.set(query, set);
        },
        removeEventListener: (_: string, fn: () => void) => {
          listeners.get(query)?.delete(fn);
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );

  return {
    resizeTo(next: number) {
      current = next;
      for (const set of listeners.values()) for (const fn of set) fn();
    },
    listenerCount() {
      return [...listeners.values()].reduce((n, set) => n + set.size, 0);
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMinWidth", () => {
  it("reports the query's current state on first render", () => {
    stubViewport(1280);
    const { result } = renderHook(() => useMinWidth("(min-width: 1024px)"));
    expect(result.current).toBe(true);
  });

  it("re-renders when the query starts matching", () => {
    const viewport = stubViewport(390);
    const { result } = renderHook(() => useMinWidth("(min-width: 1024px)"));
    expect(result.current).toBe(false);

    act(() => viewport.resizeTo(1280));
    expect(result.current).toBe(true);
  });

  it("unsubscribes on unmount", () => {
    const viewport = stubViewport(390);
    const { unmount } = renderHook(() => useMinWidth("(min-width: 1024px)"));
    expect(viewport.listenerCount()).toBe(1);

    unmount();
    expect(viewport.listenerCount()).toBe(0);
  });
});

describe("named breakpoints", () => {
  // 1023px is the width the two hooks disagree at, and the reason there are two:
  // a tablet gets the row-plus-sheet treatment, not the full rack.
  it.each([
    { width: 390, desktop: false, wide: false },
    { width: 768, desktop: true, wide: false },
    { width: 1023, desktop: true, wide: false },
    { width: 1024, desktop: true, wide: true },
  ])("at $width: desktop=$desktop wide=$wide", ({ width, desktop, wide }) => {
    stubViewport(width);
    expect(renderHook(() => useIsDesktop()).result.current).toBe(desktop);
    expect(renderHook(() => useIsWide()).result.current).toBe(wide);
  });
});
