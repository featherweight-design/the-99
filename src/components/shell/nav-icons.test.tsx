import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavIcon } from "./nav-icons";

const HREFS = ["/", "/collection", "/commanders", "/decks"] as const;

describe("NavIcon", () => {
  it("draws every slot at the handoff's geometry", () => {
    for (const href of HREFS) {
      const { container } = render(<NavIcon href={href} />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("width")).toBe("19");
      expect(svg.getAttribute("height")).toBe("19");
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      expect(svg.getAttribute("stroke-width")).toBe("1.5");
      expect(svg.getAttribute("stroke-linecap")).toBe("round");
      // The label lives on the interactive element, not on the glyph.
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("gives each slot a distinct glyph", () => {
    const paths = HREFS.map((href) => {
      const { container } = render(<NavIcon href={href} />);
      return container.querySelector("svg")!.innerHTML;
    });
    expect(new Set(paths).size).toBe(HREFS.length);
  });
});
