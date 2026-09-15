import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubViewport } from "../../test-utils/stub-viewport";
import { useIsDesktop } from "./use-is-desktop";
import { useMinWidth } from "./use-min-width";
import { CHASSIS_WIDE_MIN_PX } from "./filter-chassis";

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
  // `useIsWide` used to be tested here beside this one, at 1024px, and its own
  // header said it was the filter rack's breakpoint. It was not: every chassis
  // consumer reads `CHASSIS_WIDE_MIN_PX`, which is 1000, and nothing in `src/`
  // called the hook at all. The pair of them read as two live breakpoints in one
  // app — a reading that cost seven findings in one review — so the dead one is
  // gone and this covers the one that ships.
  it.each([
    { width: 390, desktop: false },
    { width: 767, desktop: false },
    { width: 768, desktop: true },
    { width: 1280, desktop: true },
  ])("at $width: desktop=$desktop", ({ width, desktop }) => {
    stubViewport(width);
    expect(renderHook(() => useIsDesktop()).result.current).toBe(desktop);
  });
});

// The chassis's own breakpoint, asserted at the value its consumers pass, so a
// change to the constant shows up here rather than only in a layout.
describe("the chassis breakpoint", () => {
  it.each([
    { width: 999, wide: false },
    { width: 1000, wide: true },
  ])("at $width: wide=$wide", ({ width, wide }) => {
    stubViewport(width);
    const { result } = renderHook(() =>
      useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`),
    );
    expect(result.current).toBe(wide);
  });
});
