import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubViewport } from "../../test-utils/stub-viewport";
import { useIsDesktop } from "./use-is-desktop";
import { useMinWidth, useMinWidthHinted } from "./use-min-width";
import { CHASSIS_WIDE_MIN_PX } from "./filter-chassis";

const readCookie = (name: string) =>
  document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1] ?? null;

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  });
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

describe("useMinWidthHinted", () => {
  it("returns the hint on first render, then the real query", () => {
    stubViewport(1280);
    const { result } = renderHook(() => useMinWidthHinted("(min-width: 1024px)", false, "w"));
    // jsdom has no separate SSR pass, so both renders see the live query; the hint only
    // matters as the SSR snapshot, pinned by `use-min-width.ts`'s own comment and by
    // `probe:view-flash`, which is the browser proof this unit test cannot be.
    expect(result.current).toBe(true);
  });

  it("writes the cookie once the real query disagrees with the hint", () => {
    stubViewport(390);
    renderHook(() => useMinWidthHinted("(min-width: 1024px)", true, "w"));
    expect(readCookie("w")).toBe("0");
  });

  it("writes nothing when the real query already agrees with the hint", () => {
    stubViewport(1280);
    renderHook(() => useMinWidthHinted("(min-width: 1024px)", true, "w"));
    expect(readCookie("w")).toBeNull();
  });

  // A resize back to the width the hint started at must still correct the cookie this hook
  // already moved away from it — comparing against the HINT, rather than the last value
  // written, misses this round trip and leaves the cookie reading "0" for a wide reader.
  it("corrects the cookie again on a resize back to the hinted width", () => {
    const viewport = stubViewport(1280);
    renderHook(() => useMinWidthHinted("(min-width: 1024px)", true, "w"));
    expect(readCookie("w")).toBeNull();

    act(() => viewport.resizeTo(390));
    expect(readCookie("w")).toBe("0");

    act(() => viewport.resizeTo(1280));
    expect(readCookie("w")).toBe("1");
  });
});
