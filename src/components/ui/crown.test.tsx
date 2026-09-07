import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Crown } from "./crown";

const rectsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("rect"));

describe("Crown", () => {
  it("is decorative — hidden from the accessibility tree", () => {
    const { container } = render(<Crown />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("draws three diamonds at the brand sheet's 8/11/8 geometry", () => {
    const { container } = render(<Crown />);
    const diamonds = rectsOf(container);
    expect(diamonds).toHaveLength(3);
    expect(diamonds.map((d) => d.getAttribute("width"))).toEqual(["8", "11", "8"]);
    // A square only reads as a diamond once it is turned.
    for (const d of diamonds) {
      expect(d.getAttribute("transform")).toContain("rotate(45");
    }
  });

  it("carries no animation class at rest", () => {
    const { container } = render(<Crown />);
    for (const d of rectsOf(container)) {
      expect(d.getAttribute("class")).toBeNull();
    }
  });

  it("inherits the retired dots' 1.2s stagger when pulsing", () => {
    const { container } = render(<Crown pulse />);
    const diamonds = rectsOf(container);
    for (const d of diamonds) expect(d.getAttribute("class")).toContain("anim-dots");
    expect(diamonds.map((d) => d.style.animationDelay)).toEqual([
      "0s",
      "0.2s",
      "0.4s",
    ]);
  });

  it("separates the two intensities by colour", () => {
    const colorOf = (tone: "quiet" | "page") => {
      const { container } = render(<Crown tone={tone} />);
      return rectsOf(container)[0].getAttribute("fill");
    };
    expect(colorOf("quiet")).toBe("var(--border-strong)");
    expect(colorOf("page")).toBe("var(--accent-strong)");
  });

  it("separates quiet from page by colour alone, not size", () => {
    const geometryOf = (tone: "quiet" | "page") => {
      const { container } = render(<Crown tone={tone} />);
      return [
        container.firstElementChild?.getAttribute("viewBox"),
        ...rectsOf(container).map((d) => d.getAttribute("width")),
      ];
    };
    expect(geometryOf("quiet")).toEqual(geometryOf("page"));
  });
});
