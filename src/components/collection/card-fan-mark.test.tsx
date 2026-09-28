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

  it("lightens back to front, the front card on the accent, as the mock does", () => {
    const { container } = render(<CardFanMark />);
    expect(container.querySelectorAll("rect")[2].style.stroke).toBe("var(--accent)");
  });

  it("fans the mock's 26x38 cards at -16, 0 and +16 degrees", () => {
    const { container } = render(<CardFanMark />);
    const rects = [...container.querySelectorAll("rect")];
    // Inset by half the 1.5px stroke, so the painted outer edge is the mock's 26x38.
    for (const rect of rects) {
      expect(Number(rect.getAttribute("width")) + 1.5).toBe(26);
      expect(Number(rect.getAttribute("height")) + 1.5).toBe(38);
    }
    expect(rects[0].getAttribute("transform")).toContain("rotate(-16");
    expect(rects[1].getAttribute("transform")).toBeNull();
    expect(rects[2].getAttribute("transform")).toContain("rotate(16");
  });
});
