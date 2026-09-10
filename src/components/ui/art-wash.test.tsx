import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtWash } from "./art-wash";

const layersOf = (c: HTMLElement) => Array.from(c.querySelectorAll("div"));

describe("ArtWash — cover", () => {
  it("is decorative — hidden from the accessibility tree", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("draws the art at the top of the crop, never centred", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const art = layersOf(container).find((d) => d.style.backgroundImage.includes("crop.jpg"));
    expect(art?.style.backgroundPosition).toBe("center top");
    expect(art?.style.backgroundSize).toBe("cover");
  });

  it("keeps the band and its layers when a commander has no art", () => {
    const withArt = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const without = render(<ArtWash strategy="cover" labelEdge="top" artCropUri={null} colorIdentity={["G"]} />);
    // No layout shift: the same number of layers, and the band itself unchanged.
    expect(layersOf(without.container)).toHaveLength(layersOf(withArt.container).length);
    expect(without.container.firstElementChild?.className).toBe(
      withArt.container.firstElementChild?.className,
    );
  });

  it("falls back to the colour identity, not to the stripes", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri={null} colorIdentity={["U", "R"]} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("gradient");
    expect(html).not.toContain("repeating-linear-gradient");
  });

  it("mixes every layer off a theme token — no Palette A literals", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it("exposes the hooks the accessibility rules target", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.querySelector(".art-wash-art")).toBeTruthy();
    expect(container.querySelector(".art-wash-scrim")).toBeTruthy();
  });

  it("plates below the page ground, not at it", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const plate = container.firstElementChild as HTMLElement;
    expect(plate.style.background).toContain("color-mix");
    expect(plate.style.background).toContain("black");
  });
});

describe("ArtWash — left portrait", () => {
  it("sizes the portrait off the band's height, at the crop's own 1.37:1", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const sharp = Array.from(container.querySelectorAll("div")).find((d) =>
      d.style.maskImage?.includes("90deg"),
    );
    expect(sharp?.style.width).toBe("203px");
    expect(sharp?.style.backgroundSize).toBe("auto 100%");
    expect(sharp?.style.backgroundPosition).toBe("left center");
    expect(sharp?.style.backgroundRepeat).toBe("no-repeat");
  });

  // Layer D. The commander row prints over the whole height of its band, so the
  // art is damped top and bottom as well as across; the resume row's type starts
  // clear of the portrait and needs no such thing.
  it("adds a vertical scrim at 148 and none at 72", () => {
    const tall = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const short = render(
      <ArtWash strategy="left-portrait" band={72} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    expect(tall.container.querySelectorAll(".art-wash-scrim")).toHaveLength(2);
    expect(tall.container.innerHTML).toContain("180deg");
    expect(short.container.querySelectorAll(".art-wash-scrim")).toHaveLength(1);
    expect(short.container.innerHTML).not.toContain("180deg");
  });

  // The row already draws a ground; the scrim resolves into that one, so the
  // art fades into the row rather than into a darker patch of its own.
  it("resolves each band's scrim into the ground that row draws", () => {
    const tall = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const short = render(
      <ArtWash strategy="left-portrait" band={72} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    expect(tall.container.innerHTML).not.toContain("--surface-inset");
    expect(short.container.innerHTML).toContain("--surface-inset");
    expect(short.container.innerHTML).not.toContain("var(--bg)");
  });

  it("fades the art itself, as a fraction of the art", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    // A percentage-of-width fade would drift from the portrait at every row width.
    expect(container.innerHTML).toContain("58%");
  });

  it("scales every stop with the band", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={72} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const sharp = Array.from(container.querySelectorAll("div")).find((d) =>
      d.style.maskImage?.includes("90deg"),
    );
    expect(sharp?.style.width).toBe("99px");
    expect(container.innerHTML).toContain("62%");
  });

  it("carries an ambient copy behind the portrait", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const ambient = Array.from(container.querySelectorAll("div")).find(
      (d) => d.style.backgroundSize === "cover" && d.style.opacity === "0.2",
    );
    expect(ambient).toBeDefined();
  });

  // Both art layers, or a reduced-transparency reader keeps the sharp portrait
  // at full strength behind the one the rule dimmed.
  it("marks both of its art layers for the accessibility rules", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    expect(container.querySelectorAll(".art-wash-art")).toHaveLength(2);
    expect(container.querySelector(".art-wash-scrim")).toBeTruthy();
  });

  // A flat 0.3 under `prefers-reduced-transparency` would raise the ambient copy
  // from 0.14, answering a request for less transparency with more art.
  it("publishes a reduced opacity that is a ceiling, never a floor", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={72} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const layers = Array.from(container.querySelectorAll<HTMLElement>(".art-wash-art"));
    const reduced = layers.map((l) => l.style.getPropertyValue("--art-wash-reduced-opacity"));
    expect(reduced).toEqual(["0.14", "0.3"]);
  });

  // The identity gradient is ground, not photography. Dimming it would answer a
  // request for less transparency by muting the only identity signal that row has.
  it("leaves the no-crop identity gradient at full opacity under the preference", () => {
    for (const el of [
      <ArtWash key="c" strategy="cover" labelEdge="top" artCropUri={null} colorIdentity={["G"]} />,
      <ArtWash key="p" strategy="left-portrait" band={72} artCropUri={null} colorIdentity={["G"]} />,
    ]) {
      const { container } = render(el);
      const layer = container.querySelector<HTMLElement>(".art-wash-art");
      expect(layer?.style.getPropertyValue("--art-wash-reduced-opacity")).toBe("1");
    }
  });
});

describe("left-portrait, band 168", () => {
  it("scales the portrait to 230px and lands the flat stop at 240px", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={168} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe("168px");
    const sharp = container.querySelectorAll<HTMLElement>(".art-wash-art")[1];
    expect(sharp.style.width).toBe("230px");
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim");
    expect(scrim?.style.background).toContain("134px");
    expect(scrim?.style.background).toContain("230px");
    expect(scrim?.style.background).toContain("var(--bg) 240px");
  });

  it("draws a lighter vertical scrim than the 148 row's", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={168} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const vertical = container.querySelectorAll<HTMLElement>(".art-wash-scrim")[1];
    expect(vertical.style.background).toContain("180deg");
    expect(vertical.style.background).toContain("var(--bg) 10%, transparent) 46%");
  });

  it("leaves the 148 row's vertical scrim exactly where it shipped", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const vertical = container.querySelectorAll<HTMLElement>(".art-wash-scrim")[1];
    expect(vertical.style.background).toContain("var(--bg) 16%, transparent) 42%");
  });
});

describe("cover, label edge", () => {
  it("puts the heavy end at the top for labelEdge=top", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim-cover");
    expect(scrim?.style.background).toContain("var(--bg) 78%, transparent) 0%");
    // The second stop is the hold: the label block's foot keeps the dark value
    // rather than ramping off it, which is what a subtitle sits on.
    expect(scrim?.style.background).toContain("var(--bg) 73%, transparent) 31%");
  });

  it("puts the heavy end at the bottom for labelEdge=bottom", () => {
    const { container } = render(
      <ArtWash
        strategy="cover"
        labelEdge="bottom"
        labelAt={55}
        artCropUri="/a.jpg"
        colorIdentity={["G"]}
      />,
    );
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim-cover");
    expect(scrim?.style.background).toContain("var(--bg) 44%, transparent) 0%");
    expect(scrim?.style.background).toContain("var(--bg) 88%, transparent) 100%");
  });

  it("puts the bottom ramp's dark value at the label block, wherever it is", () => {
    const at = (labelAt: number) => {
      const { container } = render(
        <ArtWash
          strategy="cover"
          labelEdge="bottom"
          labelAt={labelAt}
          artCropUri="/a.jpg"
          colorIdentity={["G"]}
        />,
      );
      return container.querySelector<HTMLElement>(".art-wash-scrim-cover")!.style.background;
    };
    // Two surfaces, two block positions, and the dark stop tracks each — the
    // shared 50% guess this replaced was late for one of them.
    expect(at(55)).toContain("var(--bg) 73%, transparent) 55%");
    expect(at(55)).toContain("var(--bg) 14%, transparent) 26%");
    expect(at(57)).toContain("var(--bg) 73%, transparent) 57%");
    expect(at(57)).toContain("var(--bg) 14%, transparent) 27%");
  });

  // R6 ruling 1. The plate is a loading device: it is darker than `--bg` so a
  // slow image never flashes light. With no art there is nothing to load, and
  // the scrim's own final stop is `var(--bg)` — so a plate ground would leave
  // the flat region darker than the card below the divider.
  it("plates a pending crop but grounds an absent one in --bg", () => {
    const withArt = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    expect((withArt.container.firstElementChild as HTMLElement).style.background).toBe(
      "color-mix(in srgb, var(--bg) 86%, black)",
    );

    const withoutArt = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri={null} colorIdentity={["G"]} />,
    );
    expect((withoutArt.container.firstElementChild as HTMLElement).style.background).toBe(
      "var(--bg)",
    );
  });
});
