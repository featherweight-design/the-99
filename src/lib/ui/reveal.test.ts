import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOTION } from "./motion";
import { reveal, scrollAt, scrollDuration, scrollTarget, type AxisGeometry } from "./reveal";

function media(reduce: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q === "(prefers-reduced-motion: reduce)" }));
}

const g = (over: Partial<AxisGeometry>): AxisGeometry => ({
  current: 0, max: 2000, viewStart: 0, viewSize: 400, elStart: 0, elSize: 100, ...over,
});

describe("scrollTarget", () => {
  it("start lines the target up with the scroller's top", () => {
    expect(scrollTarget(g({ current: 100, viewStart: 50, elStart: 650 }), "start")).toBe(700);
  });
  it("center puts the target's middle at the scroller's middle", () => {
    expect(scrollTarget(g({ elStart: 1000 }), "center")).toBe(850);
  });
  it("nearest leaves a target already in view where it is", () => {
    expect(scrollTarget(g({ current: 300, elStart: 100 }), "nearest")).toBe(300);
  });
  it("nearest moves a target below the fold only until its foot is in view", () => {
    expect(scrollTarget(g({ elStart: 500 }), "nearest")).toBe(200);
  });
  it("nearest moves a target above the view to the top", () => {
    expect(scrollTarget(g({ current: 500, elStart: -100 }), "nearest")).toBe(400);
  });
  it("clamps to what the scroller can reach", () => {
    expect(scrollTarget(g({ max: 300, elStart: 1000 }), "start")).toBe(300);
    expect(scrollTarget(g({ elStart: 10, elSize: 20 }), "center")).toBe(0);
  });
});

describe("scrollDuration and scrollAt", () => {
  it("starts at the motion duration, grows with distance, and stops at the cap", () => {
    expect(scrollDuration(0)).toBe(MOTION.durationMs);
    expect(scrollDuration(400)).toBeGreaterThan(MOTION.durationMs);
    expect(scrollDuration(400)).toBeLessThan(MOTION.scrollMaxMs);
    expect(scrollDuration(-400)).toBe(scrollDuration(400));
    expect(scrollDuration(100_000)).toBe(MOTION.scrollMaxMs);
  });
  it("eases from start to end along the motion curve", () => {
    expect(scrollAt(100, 500, 0, 400)).toBe(100);
    expect(scrollAt(100, 500, 200, 400)).toBeCloseTo(300, 0);
    // Gentle in: a tenth of the time covers well under a tenth of the way.
    expect(scrollAt(0, 1000, 40, 400)).toBeLessThan(50);
    expect(scrollAt(100, 500, 400, 400)).toBe(500);
    expect(scrollAt(100, 500, 9999, 400)).toBe(500);
  });
});

/** A 400px-tall scroller holding a target 1000px down, laid out by hand (jsdom lays out nothing). */
function scene() {
  const box = document.createElement("div");
  box.style.overflowY = "auto";
  const el = document.createElement("div");
  box.appendChild(el);
  document.body.appendChild(box);
  Object.defineProperties(box, {
    scrollHeight: { value: 3000, configurable: true },
    clientHeight: { value: 400, configurable: true },
  });
  box.getBoundingClientRect = () => ({ top: 0, left: 0, width: 300, height: 400 }) as DOMRect;
  el.getBoundingClientRect = () => ({ top: 1000 - box.scrollTop, left: 0, width: 100, height: 100 }) as DOMRect;
  el.getClientRects = () => [el.getBoundingClientRect()] as unknown as DOMRectList;
  return { box, el };
}

describe("reveal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("waits a beat, then eases the nearest scroller to the target, and finishes on it", () => {
    media(false);
    const { box, el } = scene();
    reveal(el);
    vi.advanceTimersByTime(MOTION.delayMs - 1);
    expect(box.scrollTop).toBe(0);
    vi.advanceTimersByTime(1 + 16 * 8);
    expect(box.scrollTop).toBeGreaterThan(0);
    expect(box.scrollTop).toBeLessThan(1000);
    vi.advanceTimersByTime(MOTION.scrollMaxMs + 50);
    expect(box.scrollTop).toBe(1000);
  });

  it("jumps under reduced motion, with no beat", () => {
    media(true);
    const { box, el } = scene();
    reveal(el, "center");
    expect(box.scrollTop).toBe(850);
  });

  it("moves the sideways row too when asked for an inline position", () => {
    media(true);
    const row = document.createElement("div");
    row.style.overflowX = "auto";
    const el = document.createElement("div");
    row.appendChild(el);
    document.body.appendChild(row);
    Object.defineProperties(row, {
      scrollWidth: { value: 2000, configurable: true },
      clientWidth: { value: 300, configurable: true },
    });
    row.getBoundingClientRect = () => ({ top: 0, left: 0, width: 300, height: 120 }) as DOMRect;
    el.getBoundingClientRect = () => ({ top: 0, left: 900 - row.scrollLeft, width: 100, height: 100 }) as DOMRect;
    el.getClientRects = () => [el.getBoundingClientRect()] as unknown as DOMRectList;
    window.scrollTo = vi.fn();
    reveal(el, "nearest", "center");
    expect(row.scrollLeft).toBe(800);
  });

  for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const) {
    it(`stops where it is on the reader's ${type}`, () => {
      media(false);
      const { box, el } = scene();
      reveal(el);
      vi.advanceTimersByTime(MOTION.delayMs + 16 * 8);
      const at = box.scrollTop;
      expect(at).toBeGreaterThan(0);
      window.dispatchEvent(new Event(type));
      vi.advanceTimersByTime(MOTION.scrollMaxMs + 50);
      expect(box.scrollTop).toBe(at);
    });
  }

  it("keeps going while the reader types inside the target it is bringing in", () => {
    media(false);
    const { box, el } = scene();
    const input = document.createElement("input");
    el.appendChild(input);
    reveal(el);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    vi.advanceTimersByTime(MOTION.delayMs + MOTION.scrollMaxMs + 50);
    expect(box.scrollTop).toBe(1000);
  });

  for (const init of [{ key: "Shift" }, { key: "AltGraph" }, { key: "CapsLock" }, { key: "Dead" }, { key: "Compose" }, { key: "Process", isComposing: true }] as KeyboardEventInit[]) {
    it(`keeps going on ${init.key}, a key on the way to a typed character`, () => {
      media(false);
      const { box, el } = scene();
      const input = document.createElement("input");
      el.appendChild(input);
      reveal(el);
      input.dispatchEvent(new KeyboardEvent("keydown", { ...init, bubbles: true }));
      vi.advanceTimersByTime(MOTION.delayMs + MOTION.scrollMaxMs + 50);
      expect(box.scrollTop).toBe(1000);
    });
  }

  it("keeps going on a character typed with AltGraph, which a layout may report as Ctrl plus Alt", () => {
    media(false);
    const { box, el } = scene();
    const input = document.createElement("input");
    el.appendChild(input);
    reveal(el);
    const event = new KeyboardEvent("keydown", { key: "@", ctrlKey: true, altKey: true, bubbles: true });
    event.getModifierState = (k: string) => k === "AltGraph";
    input.dispatchEvent(event);
    vi.advanceTimersByTime(MOTION.delayMs + MOTION.scrollMaxMs + 50);
    expect(box.scrollTop).toBe(1000);
  });

  it("still stops on a Ctrl shortcut typed in a field inside the target", () => {
    media(false);
    const { box, el } = scene();
    const input = document.createElement("input");
    el.appendChild(input);
    reveal(el);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }));
    vi.advanceTimersByTime(MOTION.delayMs + MOTION.scrollMaxMs + 50);
    expect(box.scrollTop).toBe(0);
  });

  it("still stops on a key that moves focus, even from inside the target", () => {
    media(false);
    const { box, el } = scene();
    const input = document.createElement("input");
    el.appendChild(input);
    reveal(el);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    vi.advanceTimersByTime(MOTION.delayMs + MOTION.scrollMaxMs + 50);
    expect(box.scrollTop).toBe(0);
  });

  it("still stops on a keypress on a button inside the target", () => {
    media(false);
    const { box, el } = scene();
    const button = document.createElement("button");
    el.appendChild(button);
    reveal(el);
    button.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    vi.advanceTimersByTime(MOTION.delayMs + MOTION.scrollMaxMs + 50);
    expect(box.scrollTop).toBe(0);
  });

  it("stops before it starts when the reader moves during the beat", () => {
    media(false);
    const { box, el } = scene();
    reveal(el);
    window.dispatchEvent(new Event("wheel"));
    vi.advanceTimersByTime(MOTION.scrollMaxMs + 200);
    expect(box.scrollTop).toBe(0);
  });

  it("a later reveal replaces one still running", () => {
    media(false);
    const { box, el } = scene();
    const other = document.createElement("div");
    box.appendChild(other);
    other.getBoundingClientRect = () => ({ top: 200 - box.scrollTop, left: 0, width: 100, height: 100 }) as DOMRect;
    other.getClientRects = () => [other.getBoundingClientRect()] as unknown as DOMRectList;
    reveal(el);
    reveal(other);
    vi.advanceTimersByTime(MOTION.delayMs + MOTION.scrollMaxMs + 50);
    expect(box.scrollTop).toBe(200);
  });

  it("does nothing without an element, or for one with no box", () => {
    expect(() => reveal(null)).not.toThrow();
    media(true);
    const { box, el } = scene();
    el.getClientRects = () => [] as unknown as DOMRectList;
    reveal(el);
    expect(box.scrollTop).toBe(0);
  });
});
