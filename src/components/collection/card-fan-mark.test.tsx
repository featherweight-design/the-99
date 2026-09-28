import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardFanMark } from "./card-fan-mark";

describe("CardFanMark", () => {
  // Prod walk 2026-09-28, item 4: three stroke-only rects read as outlines crossing
  // each other. Each card must carry a fill so the one in front covers the one behind.
  it("fills every card, so the front one covers the one behind", () => {
    const { container } = render(<CardFanMark />);
    const rects = [...container.querySelectorAll("rect")];
    expect(rects).toHaveLength(3);
    for (const rect of rects) {
      expect(rect.getAttribute("fill")).not.toBe("none");
      expect(rect.style.fill).toMatch(/var\(--/);
    }
    expect(container.querySelector("svg")?.getAttribute("fill")).not.toBe("none");
  });

  it("draws the front card on the accent, as the other fans do", () => {
    const { container } = render(<CardFanMark />);
    expect(container.querySelectorAll("rect")[2].style.stroke).toBe("var(--accent)");
  });
});
