import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubViewport } from "../../test-utils/stub-viewport";
import { useIsDesktop } from "./use-is-desktop";
import { useIsWide } from "./use-is-wide";
import { useMinWidth } from "./use-min-width";

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
