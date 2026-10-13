import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
