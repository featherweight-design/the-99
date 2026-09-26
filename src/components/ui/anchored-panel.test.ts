import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
    expect(at).toEqual({ top: 134, left: 676 });
  });

  it("clamps into the 8px margin when right-aligning would put it off the left edge", () => {
    const at = setup({ rect: { top: 100, bottom: 144, right: 60 }, height: 170, vw: 390, vh: 844 });
    expect(at).toEqual({ top: 150, left: 8 });
  });

  it("flips above its trigger when there is no room below", () => {
    const at = setup({ rect: { top: 800, bottom: 830, right: 900 }, height: 170 });
    expect(at).toEqual({ top: 800 - 4 - 170, left: 676 });
  });

  it("treats the phone's tab bar as no room", () => {
    // 500 + 6 + 170 + 8 = 684 fits under 844, and does not fit above a 200px tab bar.
    const at = setup({ rect: { top: 456, bottom: 500, right: 300 }, height: 170, vw: 390, vh: 844, tabbar: 200 });
    expect(at).toEqual({ top: 456 - 6 - 170, left: 76 });
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
