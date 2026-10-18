import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnchoredPanel } from "./anchored-panel";

// jsdom lays nothing out, so the trigger's rect and the panel's height are stated. What this pins
// is the arithmetic `place()` applies to them; `probe:delete-confirm` reads the laid-out result.
function setup({ rect, height, vw = 1300, vh = 900, tabbar = 0 }: {
  rect: { top: number; bottom: number; right: number };
  height: number;
  vw?: number;
  vh?: number;
  tabbar?: number;
}) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: vw });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: vh });
  document.documentElement.style.setProperty("--tabbar-h", `${tabbar}px`);
  const { result } = renderHook(() => useAnchoredPanel({ open: false, width: 224 }));
  const trigger = document.createElement("button");
  trigger.getBoundingClientRect = () => ({ ...rect, left: rect.right - 30, width: 30, height: rect.bottom - rect.top, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  const panel = document.createElement("div");
  Object.defineProperty(panel, "offsetHeight", { value: height });
  (result.current.triggerRef as { current: HTMLButtonElement | null }).current = trigger;
  (result.current.panelRef as { current: HTMLDivElement | null }).current = panel;
  act(() => result.current.place());
  return result.current.at;
}

afterEach(() => document.documentElement.style.removeProperty("--tabbar-h"));

describe("useAnchoredPanel's placement", () => {
  it("hangs the panel under its trigger, right edges aligned, 4px down from sm", () => {
    const at = setup({ rect: { top: 100, bottom: 130, right: 900 }, height: 170 });
    expect(at).toEqual({ top: 134, left: 676, maxHeight: 900 - 130 - 4 - 8 });
  });

  it("clamps into the 8px margin when right-aligning would put it off the left edge", () => {
    const at = setup({ rect: { top: 100, bottom: 144, right: 60 }, height: 170, vw: 390, vh: 844 });
    expect(at).toEqual({ top: 150, left: 8, maxHeight: 844 - 144 - 6 - 8 });
  });

  it("flips above its trigger when there is no room below", () => {
    const at = setup({ rect: { top: 800, bottom: 830, right: 900 }, height: 170 });
    expect(at).toEqual({ top: 800 - 4 - 170, left: 676, maxHeight: 800 - 4 - 8 });
  });

  it("treats the phone's tab bar as no room", () => {
    // 500 + 6 + 170 + 8 = 684 fits under 844, and does not fit above a 200px tab bar.
    const at = setup({ rect: { top: 456, bottom: 500, right: 300 }, height: 170, vw: 390, vh: 844, tabbar: 200 });
    expect(at).toEqual({ top: 456 - 6 - 170, left: 76, maxHeight: 456 - 6 - 8 });
  });
});

describe("useAnchoredPanel's room (a max height within the viewport)", () => {
  it("hangs below whenever the panel fits there, even when above has more room", () => {
    // Below: 900 - 630 - 4 - 8 = 258 holds 200. Above has 588 and is not taken.
    const at = setup({ rect: { top: 600, bottom: 630, right: 900 }, height: 200 });
    expect(at).toEqual({ top: 634, left: 676, maxHeight: 258 });
  });

  it("flips to the larger side when it fits neither, capped at that side's room", () => {
    // 500 fits neither: below 358, above 488. Above is larger, so it hangs above, capped at 488,
    // its foot at the trigger's top less the gap rather than pinned over the trigger.
    const at = setup({ rect: { top: 500, bottom: 530, right: 900 }, height: 500 });
    expect(at).toEqual({ top: 500 - 4 - 488, left: 676, maxHeight: 488 });
  });

  it("stays below when it fits neither and below is the larger side", () => {
    // 700 fits neither: below 558, above 288.
    const at = setup({ rect: { top: 300, bottom: 330, right: 900 }, height: 700 });
    expect(at).toEqual({ top: 334, left: 676, maxHeight: 558 });
  });

  it("chooses the side by the panel's natural height, not the height its own cap gave it", () => {
    // Capped at the 58px below, the panel would always "fit" below and never flip. The cap is
    // lifted for the read, so its 300px is what is weighed.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1300 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    const { result } = renderHook(() => useAnchoredPanel({ open: false, width: 224 }));
    const trigger = document.createElement("button");
    trigger.getBoundingClientRect = () => ({ top: 800, bottom: 830, right: 900, left: 870, width: 30, height: 30, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const panel = document.createElement("div");
    panel.style.maxHeight = "58px";
    Object.defineProperty(panel, "offsetHeight", { get: () => (panel.style.maxHeight === "none" ? 300 : 58) });
    (result.current.triggerRef as { current: HTMLButtonElement | null }).current = trigger;
    (result.current.panelRef as { current: HTMLDivElement | null }).current = panel;
    act(() => result.current.place());
    expect(result.current.at).toEqual({ top: 800 - 4 - 300, left: 676, maxHeight: 788 });
    expect(panel.style.maxHeight).toBe("58px");
  });

  it("excludes the tab bar from the room below on the phone, and only on the phone", () => {
    // Phone: 844 - 64 - 300 - 6 - 8 = 466.
    const phone = setup({ rect: { top: 256, bottom: 300, right: 300 }, height: 100, vw: 390, vh: 844, tabbar: 64 });
    expect(phone?.maxHeight).toBe(466);
    // Desktop: the tab bar is not drawn, so the same token takes nothing: 900 - 130 - 4 - 8.
    const desk = setup({ rect: { top: 100, bottom: 130, right: 900 }, height: 170, tabbar: 64 });
    expect(desk?.maxHeight).toBe(758);
  });

  it("recomputes the room when a scroll moves the trigger", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1300 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
      const rect = { top: 100, bottom: 130 };
      const trigger = document.createElement("button");
      trigger.getBoundingClientRect = () => ({ ...rect, right: 900, left: 870, width: 30, height: 30, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const panel = document.createElement("div");
      Object.defineProperty(panel, "offsetHeight", { value: 170 });
      const { result } = renderHook(() => {
        const hook = useAnchoredPanel({ open: true, width: 224 });
        (hook.triggerRef as { current: HTMLButtonElement | null }).current = trigger;
        (hook.panelRef as { current: HTMLDivElement | null }).current = panel;
        return hook;
      });
      expect(result.current.at?.maxHeight).toBe(900 - 130 - 4 - 8);
      // The page scrolls 400px: the trigger moves with no resize and no call from the caller.
      rect.top = 500;
      rect.bottom = 530;
      act(() => {
        vi.advanceTimersByTime(32);
      });
      expect(result.current.at).toEqual({ top: 534, left: 676, maxHeight: 900 - 530 - 4 - 8 });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("useAnchoredPanel without ResizeObserver", () => {
  it("still opens and places the panel in an engine that lacks the API", () => {
    const saved = globalThis.ResizeObserver;
    // @ts-expect-error: the engine the guard exists for.
    delete globalThis.ResizeObserver;
    try {
      const trigger = document.createElement("button");
      trigger.getBoundingClientRect = () => ({ top: 100, bottom: 130, right: 900, left: 870, width: 30, height: 30, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const panel = document.createElement("div");
      const { result, rerender } = renderHook(({ open }) => {
        const hook = useAnchoredPanel({ open, width: 224 });
        (hook.triggerRef as { current: HTMLButtonElement | null }).current = trigger;
        (hook.panelRef as { current: HTMLDivElement | null }).current = panel;
        return hook;
      }, { initialProps: { open: false } });
      expect(() => rerender({ open: true })).not.toThrow();
      expect(result.current.at).not.toBeNull();
    } finally {
      globalThis.ResizeObserver = saved;
    }
  });
});
