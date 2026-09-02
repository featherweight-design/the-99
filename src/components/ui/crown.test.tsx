import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Crown } from "./crown";

describe("Crown", () => {
  it("is decorative — hidden from the accessibility tree", () => {
    const { container } = render(<Crown />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("draws three diamonds at the specced 9/13/9 geometry", () => {
    const { container } = render(<Crown />);
    const diamonds = Array.from(container.querySelectorAll("span"));
    expect(diamonds).toHaveLength(3);
    expect(diamonds.map((d) => d.className)).toEqual([
      expect.stringContaining("w-[9px]"),
      expect.stringContaining("w-[13px]"),
      expect.stringContaining("w-[9px]"),
    ]);
  });

  it("carries no animation class at rest", () => {
    const { container } = render(<Crown />);
    for (const d of container.querySelectorAll("span")) {
      expect(d.className).not.toContain("anim-dots");
    }
  });

  it("inherits the retired dots' 1.2s stagger when pulsing", () => {
    const { container } = render(<Crown pulse />);
    const diamonds = Array.from(container.querySelectorAll("span"));
    for (const d of diamonds) expect(d.className).toContain("anim-dots");
    expect(diamonds.map((d) => (d as HTMLElement).style.animationDelay)).toEqual([
      "0s",
      "0.2s",
      "0.4s",
    ]);
  });

  it("separates the three intensities by colour", () => {
    const colorOf = (tone: "quiet" | "page" | "loud") => {
      const { container } = render(<Crown tone={tone} />);
      return (container.querySelector("span") as HTMLElement).style.background;
    };
    expect(colorOf("quiet")).toBe("var(--border-strong)");
    expect(colorOf("page")).toBe("var(--brass-strong)");
    expect(colorOf("loud")).toBe("var(--brass)");
  });

  it("doubles the geometry for the one loud crown", () => {
    const { container } = render(<Crown tone="loud" />);
    const diamonds = Array.from(container.querySelectorAll("span"));
    expect(diamonds.map((d) => d.className)).toEqual([
      expect.stringContaining("w-[18px]"),
      expect.stringContaining("w-[26px]"),
      expect.stringContaining("w-[18px]"),
    ]);
    expect(container.firstElementChild?.className).toContain("gap-[14px]");
  });
});
