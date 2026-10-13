import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAiSweepRef } from "./use-ai-sweep";

function Host({ w, h }: { w: number; h: number }) {
  const ref = useAiSweepRef();
  return (
    <div
      data-testid="host"
      ref={(el) => {
        if (el) el.getBoundingClientRect = () => ({ width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });
        ref(el);
      }}
    />
  );
}

const startOf = (w: number, h: number) => {
  const { getByTestId, unmount } = render(<Host w={w} h={h} />);
  const v = parseFloat(getByTestId("host").style.getPropertyValue("--ai-sweep-start"));
  unmount();
  return v;
};

// The lap starts at the top-right corner: its angle from the top, clockwise, is atan2(width, height).
describe("the firefly's start angle", () => {
  it("is 45deg on a square, steeper on a wide band and shallower on a tall card", () => {
    expect(startOf(200, 200)).toBeCloseTo(45, 5);
    expect(startOf(1000, 250)).toBeCloseTo(75.96, 1);
    expect(startOf(200, 400)).toBeCloseTo(26.57, 1);
  });

  it("leaves an unmeasured box on the stylesheet's own 45deg", () => {
    const { getByTestId } = render(<Host w={0} h={0} />);
    expect(getByTestId("host").style.getPropertyValue("--ai-sweep-start")).toBe("");
  });
});

// The start follows the box: a viewport or content resize moves the corner, and the ResizeObserver is what notices.
describe("the firefly's start angle, kept current", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("re-measures when the host's box changes", () => {
    let notify: () => void = () => {};
    let disconnected = 0;
    vi.stubGlobal("ResizeObserver", class {
      constructor(cb: () => void) { notify = cb; }
      observe() {}
      disconnect() { disconnected += 1; }
    });
    let box = { w: 200, h: 200 };
    function Resizable() {
      const ref = useAiSweepRef();
      return (
        <div
          data-testid="host"
          ref={(el) => {
            if (el) el.getBoundingClientRect = () => ({ width: box.w, height: box.h, top: 0, left: 0, right: box.w, bottom: box.h, x: 0, y: 0, toJSON: () => ({}) });
            ref(el);
          }}
        />
      );
    }
    const { getByTestId, unmount } = render(<Resizable />);
    const read = () => parseFloat(getByTestId("host").style.getPropertyValue("--ai-sweep-start"));
    expect(read()).toBeCloseTo(45, 5);
    box = { w: 1000, h: 250 };
    notify();
    expect(read()).toBeCloseTo(75.96, 1);
    unmount();
    expect(disconnected).toBeGreaterThan(0);
  });
});
