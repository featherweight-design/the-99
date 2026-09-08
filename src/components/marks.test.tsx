import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Crowned99 } from "./marks";

const SQRT2 = Math.SQRT2;

function draw(variant: Parameters<typeof Crowned99>[0]["variant"]) {
  const { container } = render(<Crowned99 variant={variant} />);
  const svg = container.querySelector("svg")!;
  const [, , width, height] = svg.getAttribute("viewBox")!.split(" ").map(Number);
  const diamonds = [...container.querySelectorAll("rect")].map((rect) => ({
    side: Number(rect.getAttribute("width")),
    // A rect is rotated 45° about its own centre, so the drawn diamond's points
    // sit ±side·√2/2 either side of that centre — not ±side/2.
    centerX: Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2,
  }));
  const numeral = container.querySelector("text")!;
  const crownBottom = Math.max(
    ...[...container.querySelectorAll("rect")].map(
      (rect) =>
        Number(rect.getAttribute("y")) +
        Number(rect.getAttribute("height")) / 2 +
        (Number(rect.getAttribute("height")) * SQRT2) / 2,
    ),
  );
  return { svg, width, height, diamonds, numeral, crownBottom, baselineY: Number(numeral.getAttribute("y")) };
}

/** Visible air between two neighbouring diamonds' facing points. */
function airBetween(a: { side: number; centerX: number }, b: { side: number; centerX: number }) {
  return b.centerX - a.centerX - ((a.side + b.side) * SQRT2) / 2;
}

describe("Crowned99", () => {
  // The 62px rail's head. Every number here is CHROME-rail-mark.md's ruling 1a,
  // read through `crownBox`'s diagonal layout rather than the canvas's flex one
  // — which is the whole reason this test exists rather than a copied constant.
  describe("rail-62", () => {
    it("draws the crown at 6 / 8.5 / 6 with 3px of air between the points", () => {
      const { diamonds } = draw("rail-62");

      expect(diamonds.map((d) => d.side)).toEqual([6, 8.5, 6]);
      // 3px is what the handoff asks to *see*. Its own 6px is the flex-gap
      // conversion for unrotated boxes, which an SVG does not need; passing it
      // through would double the air and is the bug this asserts against.
      expect(airBetween(diamonds[0], diamonds[1])).toBeCloseTo(3, 5);
      expect(airBetween(diamonds[1], diamonds[2])).toBeCloseTo(3, 5);
    });

    it("is 39px tall, which is the height the rail's head zone is measured from", () => {
      // 12 + 4 + 23: the crown row (8.5√2), the 4px under it, the numerals.
      const { height } = draw("rail-62");
      expect(height).toBeCloseTo(39, 1);
    });

    // The canvas sets these numerals as HTML with `line-height: 1`, whose −4px
    // of half-leading pulls the baseline to 18px inside a box that starts 4px
    // below the crown. An SVG has no line box, so the baseline is placed by
    // hand — and placing it at 4 + 23 instead, as the em-box reading of the
    // handoff would, drops the digits 5px and opens a trench under the crown.
    it("puts the numeral baseline 22px under the crown, as the canvas draws it", () => {
      const { baselineY, crownBottom } = draw("rail-62");
      expect(baselineY - crownBottom).toBeCloseTo(22, 5);
    });

    it("draws numerals at 23px Cinzel 900, in --fg under an --accent crown", () => {
      const { numeral, svg } = draw("rail-62");
      expect(numeral).toHaveAttribute("font-size", "23");
      expect(numeral).toHaveAttribute("font-weight", "900");
      // Both colours are tokens, so all six themes are covered without a
      // per-theme value.
      expect(numeral).toHaveAttribute("fill", "var(--fg)");
      expect(svg.querySelector("rect")).toHaveAttribute("fill", "var(--accent)");
    });

    it("announces the mark once, as an image named The 99", () => {
      const { svg } = draw("rail-62");
      expect(svg).toHaveAttribute("role", "img");
      expect(svg).toHaveAttribute("aria-label", "The 99");
    });
  });

  // `crownGap` and `bottomPad` were hoisted out of the render body to let
  // rail-62 set them; the other three variants pass the values that were
  // hardcoded there, so their drawings must not have moved.
  describe("the variants rail-62 did not touch", () => {
    const UNCHANGED = [
      { variant: "hero-mobile", sides: [13, 18, 13], air: 8, width: 109.8, height: 127.46, numeralSize: "92", weight: "900" },
      { variant: "hero-desktop", sides: [18, 25, 18], air: 11, width: 155.8, height: 177.36, numeralSize: "132", weight: "900" },
      { variant: "mobile-header", sides: [5, 7, 5], air: 3, width: 34.04, height: 43.9, numeralSize: "24", weight: "800" },
    ] as const;

    it.each(UNCHANGED)(
      "$variant is drawn exactly as before",
      ({ variant, sides, air, width, height, numeralSize, weight }) => {
        const drawn = draw(variant);
        expect(drawn.diamonds.map((d) => d.side)).toEqual([...sides]);
        expect(airBetween(drawn.diamonds[0], drawn.diamonds[1])).toBeCloseTo(air, 5);
        expect(drawn.width).toBeCloseTo(width, 1);
        expect(drawn.height).toBeCloseTo(height, 1);
        expect(drawn.numeral).toHaveAttribute("font-size", numeralSize);
        expect(drawn.numeral).toHaveAttribute("font-weight", weight);
      },
    );
  });
});
