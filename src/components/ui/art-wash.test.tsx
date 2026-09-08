import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtWash } from "./art-wash";

const layersOf = (c: HTMLElement) => Array.from(c.querySelectorAll("div"));

describe("ArtWash — cover", () => {
  it("is decorative — hidden from the accessibility tree", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("draws the art at the top of the crop, never centred", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const art = layersOf(container).find((d) => d.style.backgroundImage.includes("crop.jpg"));
    expect(art?.style.backgroundPosition).toBe("center top");
    expect(art?.style.backgroundSize).toBe("cover");
  });

  it("keeps the band and its layers when a commander has no art", () => {
    const withArt = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const without = render(<ArtWash strategy="cover" artCropUri={null} colorIdentity={["G"]} />);
    // No layout shift: the same number of layers, and the band itself unchanged.
    expect(layersOf(without.container)).toHaveLength(layersOf(withArt.container).length);
    expect(without.container.firstElementChild?.className).toBe(
      withArt.container.firstElementChild?.className,
    );
  });

  it("falls back to the colour identity, not to the stripes", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri={null} colorIdentity={["U", "R"]} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("gradient");
    expect(html).not.toContain("repeating-linear-gradient");
  });

  it("mixes every layer off a theme token — no Palette A literals", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });
});
