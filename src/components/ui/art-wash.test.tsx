import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtWash, BlockScrim, bottomScrimStops, RAMP_LEAD } from "./art-wash";

const layersOf = (c: HTMLElement) => Array.from(c.querySelectorAll("div"));

describe("ArtWash — cover", () => {
  // `block` hands the ramp to the label block, so the band paints none of its own: two ramps
  // would stack to darker than either is measured at.
  it("paints no scrim of its own when the block draws the ramp", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx="block" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.querySelector(".art-wash-scrim")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-art-wash-label-at", "block");
  });

  // The block's ramp is `bottomScrimStops` measured by layout: it starts RAMP_LEAD of the block
  // above the block and holds at the block's top, at the same hold.
  it("draws the block's ramp as the band's rule, keyed to the block", () => {
    const { container } = render(<BlockScrim insetX={18} />);
    const scrim = container.firstElementChild as HTMLElement;
    expect(scrim.style.top).toBe(`${-RAMP_LEAD * 100}%`);
    const holdAt = (RAMP_LEAD / (1 + RAMP_LEAD)) * 100;
    expect(scrim.style.background).toContain(`${holdAt.toFixed(3)}%`);
    expect(scrim.style.background).toContain("73%");
    // Same hold the band's own ramp holds at.
    expect(bottomScrimStops(100, 288)[2][0]).toBe(73);
  });

  it("is decorative — hidden from the accessibility tree", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("draws the art at the top of the crop, never centred", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const art = layersOf(container).find((d) => d.style.backgroundImage.includes("crop.jpg"));
    expect(art?.style.backgroundPosition).toBe("center top");
    expect(art?.style.backgroundSize).toBe("cover");
  });

  it("keeps the band and its layers when a commander has no art", () => {
    const withArt = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const without = render(<ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri={null} colorIdentity={["G"]} />);
    // No layout shift: the same number of layers, and the band itself unchanged.
    expect(layersOf(without.container)).toHaveLength(layersOf(withArt.container).length);
    expect(without.container.firstElementChild?.className).toBe(
      withArt.container.firstElementChild?.className,
    );
  });

  it("falls back to the colour identity, not to the stripes", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri={null} colorIdentity={["U", "R"]} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("gradient");
    expect(html).not.toContain("repeating-linear-gradient");
  });

  it("mixes every layer off a theme token — no Palette A literals", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it("exposes the hooks the accessibility rules target", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.querySelector(".art-wash-art")).toBeTruthy();
    expect(container.querySelector(".art-wash-scrim")).toBeTruthy();
  });

  it("plates below the page ground, not at it", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const plate = container.firstElementChild as HTMLElement;
    expect(plate.style.background).toContain("color-mix");
    expect(plate.style.background).toContain("black");
  });
});

describe("ArtWash — left portrait", () => {
  it("sizes the portrait off the band's height, at the crop's own 1.37:1", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={63} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const sharp = Array.from(container.querySelectorAll("div")).find((d) =>
      d.style.maskImage?.includes("90deg"),
    );
    expect(sharp?.style.width).toBe("285px");
    expect(sharp?.style.backgroundSize).toBe("auto 100%");
    expect(sharp?.style.backgroundPosition).toBe("left center");
    expect(sharp?.style.backgroundRepeat).toBe("no-repeat");
  });

  // Layer D. The commander row prints type over the portrait, so the art is
  // damped down the band as well as across; the resume row's type starts clear
  // of the portrait and needs no such thing.
  it("adds a vertical scrim where a block sits on the portrait, and none where it is flat", () => {
    const tall = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={63} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const flat = render(
      <ArtWash strategy="left-portrait" height={288} portrait={560} labelAtPx="flat" artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    expect(tall.container.querySelectorAll(".art-wash-scrim")).toHaveLength(2);
    expect(tall.container.innerHTML).toContain("180deg");
    expect(flat.container.querySelectorAll(".art-wash-scrim")).toHaveLength(1);
    expect(flat.container.innerHTML).not.toContain("180deg");
  });

  // One ramp at both widths, with no breakpoint swap. The row is `items-end` at
  // either width, so one hold keyed to the taller of the two blocks covers both
  // — the flat hold this replaced darkened the whole band to protect its bottom
  // third.
  it("damps a row band with one ramp at every width", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={63} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const scrims = container.querySelectorAll<HTMLElement>(".art-wash-scrim");
    expect(scrims).toHaveLength(2);
    for (const s of scrims) expect(s.className).not.toContain("hidden");
    expect(scrims[1].style.background).toContain("180deg");
    // Clear above the block, then held flat from its top edge to the foot.
    // One function for both strategies, one shape, and the hold answering to the
    // art beneath it: a portrait's sharp layer draws at 0.92 against the cover
    // band's 0.8, so 73 leaves `--fg-body` at 4.33:1 there and 78 is what the
    // column this replaced held for the same reason.
    expect(scrims[1].style.background).toContain("var(--bg) 0%, transparent) 55%");
    expect(scrims[1].style.background).toContain("var(--bg) 78%, transparent) 70%");
    expect(scrims[1].style.background).toContain("var(--bg) 78%, transparent) 100%");
  });

  // The portrait carries no wash of its own until the crop starts fading out
  // into the row. `color-mix(... 0%)` rather than `transparent`, which is a
  // transparent *black* and hazes the half of the crop this ramp leaves alone.
  it("leaves the portrait unwashed out to the band's clear stop", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={63} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const horizontal = container.querySelector<HTMLElement>(".art-wash-scrim");
    expect(horizontal?.style.background).toContain("var(--bg) 0%, transparent) 0px");
    // 58% of 285, derived — the crop runs clear to where its own mask starts
    // fading and not a pixel further.
    expect(horizontal?.style.background).toContain("var(--bg) 0%, transparent) 165px");
  });

  // Every portrait grounds in `--bg` now. The resume row's `--surface-inset`
  // ground went with A4: that row drew its own inset surface because its type
  // started clear of the portrait, and a `cover` band puts every string of it on
  // the wash.
  it("grounds every portrait in the page's own ground", () => {
    for (const el of [
      <ArtWash key="a" strategy="left-portrait" height={208} portrait={285} labelAtPx={63} artCropUri="crop.jpg" colorIdentity={["B"]} />,
      <ArtWash key="b" strategy="left-portrait" height={168} portrait={230} labelAtPx={40} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    ]) {
      const { container } = render(el);
      expect(container.innerHTML).not.toContain("--surface-inset");
      expect(container.innerHTML).toContain("var(--bg)");
    }
  });

  it("fades the art itself, as a fraction of the art", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={63} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    // A percentage-of-width fade would drift from the portrait at every row width.
    expect(container.innerHTML).toContain("58%");
  });

  it("scales every stop with the portrait", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={168} portrait={230} labelAtPx={40} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const sharp = Array.from(container.querySelectorAll("div")).find((d) =>
      d.style.maskImage?.includes("90deg"),
    );
    expect(sharp?.style.width).toBe("230px");
    // One mask edge for every portrait: the 62% the 72 band drew was its own, and
    // that band retires with the resume row.
    expect(container.innerHTML).toContain("58%");
    expect(container.innerHTML).not.toContain("62%");
  });

  it("draws the crop once, and only where the portrait is", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={63} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const art = Array.from(container.querySelectorAll<HTMLElement>(".art-wash-art"));
    expect(art).toHaveLength(1);
    // The one layer is the masked portrait, not a band-wide `cover` copy: a
    // second scaling of the same picture across the whole band read as a double
    // image, and at desktop widths it was the more visible of the two.
    expect(art[0].style.backgroundSize).toBe("auto 100%");
    expect(art[0].style.width).toBe("285px");
    expect(container.querySelector(".art-wash-scrim")).toBeTruthy();
  });

  // A flat 0.3 under `prefers-reduced-transparency` must not RAISE a layer that
  // already sits below it.
  it("publishes a reduced opacity that is a ceiling, never a floor", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={168} portrait={230} labelAtPx={40} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const layers = Array.from(container.querySelectorAll<HTMLElement>(".art-wash-art"));
    expect(layers.map((l) => l.style.getPropertyValue("--art-wash-reduced-opacity"))).toEqual(["0.3"]);
  });

  // The identity gradient is ground, not photography. Dimming it would answer a
  // request for less transparency by muting the only identity signal that row has.
  it("leaves the no-crop identity gradient at full opacity under the preference", () => {
    for (const el of [
      <ArtWash key="c" strategy="cover" height={288} labelAtPx={46} artCropUri={null} colorIdentity={["G"]} />,
      <ArtWash key="p" strategy="left-portrait" height={168} portrait={230} labelAtPx={40} artCropUri={null} colorIdentity={["G"]} />,
    ]) {
      const { container } = render(el);
      const layer = container.querySelector<HTMLElement>(".art-wash-art");
      expect(layer?.style.getPropertyValue("--art-wash-reduced-opacity")).toBe("1");
    }
  });
});

describe("left-portrait, band 168", () => {
  // 133px, not the 134 this shipped with: `clearTo` is now derived from the
  // portrait's own rule — the crop runs clear to where its own mask starts fading
  // and not a pixel further — and `round(58% × 230)` is 133.4. The handoff's
  // portrait table already prints 133 for this row, so the pixel is priced rather
  // than discovered. It is the only column that derives; the flat stop does not.
  it("scales the portrait to 230px and lands the flat stop at 240px", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={168} portrait={230} labelAtPx="flat" artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe("168px");
    const art = container.querySelectorAll<HTMLElement>(".art-wash-art");
    expect(art).toHaveLength(1);
    expect(art[0].style.width).toBe("230px");
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim");
    expect(scrim?.style.background).toContain("var(--bg) 0%, transparent) 133px");
    expect(scrim?.style.background).toContain("230px");
    expect(scrim?.style.background).toContain("var(--bg) 240px");
  });

  // The spine's title starts at a 254px inset, past this band's 240px flat stop,
  // and the `⛶ Card details` pill at the bottom-left plates itself to
  // `OVER_ART_PLATE`. Nothing on the band needs a vertical ramp, so it draws one
  // scrim and no more — a second layer here damped the crop across the whole
  // band's width for one 26px control.
  it("draws no vertical ramp: nothing on this band stands on one", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" height={168} portrait={230} labelAtPx="flat" artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    expect(container.querySelectorAll(".art-wash-scrim")).toHaveLength(1);
  });
});

describe("cover, the one label edge", () => {
  // There is one edge now, so there is nothing to choose and no class naming a
  // choice. What used to be the `top` ramp — heavy at 0%, holding to 31%, thin
  // below — is gone with the last surface that printed at a band's top edge.
  it("draws one ramp, clear at the top and held to the foot", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim-cover")!;
    // Clear at the top: the only things up there plate themselves, and `center
    // top` puts the face exactly where the old ramp ran at 78%.
    expect(scrim.style.background).toContain("var(--bg) 0%, transparent) 0%");
    expect(scrim.style.background).toContain("var(--bg) 73%, transparent) 100%");
    expect(scrim.style.background).not.toContain("var(--bg) 78%");
  });

  it("names no label edge in the class", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    expect(container.querySelector(".art-wash-scrim-cover")).not.toBeNull();
    expect(container.querySelector(".art-wash-scrim-cover-top")).toBeNull();
    expect(container.querySelector(".art-wash-scrim-cover-bottom")).toBeNull();
  });

  it("puts the ramp's dark value at the label block, wherever it is", () => {
    const at = (labelAtPx: number) => {
      const { container } = render(
        <ArtWash
          strategy="cover"
          height={288}
          labelAtPx={labelAtPx}
          artCropUri="/a.jpg"
          colorIdentity={["G"]}
        />,
      );
      return container.querySelector<HTMLElement>(".art-wash-scrim-cover")!.style.background;
    };
    // Two surfaces, two block heights, and both the hold and the point the climb
    // starts from track each. In pixels, so a taller band moves the hold UP the
    // gradient rather than scaling its darkness — which is the whole change.
    expect(at(46)).toContain("var(--bg) 73%, transparent) 84%");
    expect(at(46)).toContain("var(--bg) 0%, transparent) 76%");
    expect(at(109)).toContain("var(--bg) 73%, transparent) 62%");
    expect(at(109)).toContain("var(--bg) 0%, transparent) 44%");
  });

  // R6 ruling 1. The plate is a loading device: it is darker than `--bg` so a
  // slow image never flashes light. With no art there is nothing to load, and
  // the scrim's own final stop is `var(--bg)` — so a plate ground would leave
  // the flat region darker than the card below the divider.
  it("plates a pending crop but grounds an absent one in --bg", () => {
    const withArt = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    expect((withArt.container.firstElementChild as HTMLElement).style.background).toBe(
      "color-mix(in srgb, var(--bg) 86%, black)",
    );

    const withoutArt = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri={null} colorIdentity={["G"]} />,
    );
    expect((withoutArt.container.firstElementChild as HTMLElement).style.background).toBe(
      "var(--bg)",
    );
  });
});

// ── The stated shape: a band in px, a block in px from the foot ──────────────
// Every render migrates onto this one. The two unions overlap only while the
// surfaces still sizing themselves from an `aspect-ratio` catch up.

describe("ArtWash — a stated band", () => {
  it("owns its height rather than taking one from the row", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={248} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe("248px");
    // Not `inset-0`: the band is its own box, so a parent that grew cannot
    // stretch the crop's `cover` past the band it was drawn for.
    expect(root.className).toContain("top-0");
  });

  // The round's load-bearing change, asserted as arithmetic rather than as a
  // prop rename. A px `labelAt` through the old one-argument percentage
  // signature would hold this at 46% — 114px down a 248 band, where every
  // drawing puts the hold at 81%.
  it("reads labelAtPx as pixels from the foot, not as a percentage", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={248} labelAtPx={46} artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim");
    expect(scrim?.style.background).toContain("var(--bg) 0%, transparent) 73%");
    expect(scrim?.style.background).toContain("var(--bg) 73%, transparent) 81%");
    expect(scrim?.style.background).toContain("var(--bg) 73%, transparent) 100%");
    expect(scrim?.style.background).not.toContain("46%");
  });

  // Added height becomes unveiled art rather than more darkness — which is the
  // whole reason the unit changed. Same block, taller band, later ramp.
  it("unveils more art as the band grows, at one block height", () => {
    const at = (height: 168 | 208 | 248 | 288) => {
      const { container } = render(
        <ArtWash strategy="cover" height={height} labelAtPx={46} artCropUri="c.jpg" colorIdentity={["G"]} />,
      );
      return container.querySelector<HTMLElement>(".art-wash-scrim")!.style.background;
    };
    expect(at(168)).toContain("transparent) 59%");
    expect(at(208)).toContain("transparent) 67%");
    expect(at(248)).toContain("transparent) 73%");
    expect(at(288)).toContain("transparent) 76%");
  });

  // No edge in the class, because there is no longer an edge to choose: the
  // stylesheet override exists only for the top ramp, and a bottom-labelled
  // band's stops come from a `labelAtPx` no stylesheet can see.
  it("carries no label-edge class", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim");
    expect(scrim?.className).toContain("art-wash-scrim-cover");
    expect(scrim?.className).not.toContain("art-wash-scrim-cover-top");
    expect(scrim?.className).not.toContain("art-wash-scrim-cover-bottom");
  });

  // One band, two portraits. The desktop deck header picks its portrait's shape
  // first and lets the band follow, so the geometry cannot be keyed by height.
  it("draws either portrait on one band, and derives each clear stop", () => {
    const wide = render(
      <ArtWash strategy="left-portrait" height={288} portrait={560} labelAtPx="flat" artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    const narrow = render(
      <ArtWash strategy="left-portrait" height={288} portrait={340} labelAtPx="flat" artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    const sharp = (r: typeof wide) =>
      Array.from(r.container.querySelectorAll<HTMLElement>("div")).find((d) =>
        d.style.maskImage?.includes("90deg"),
      )!;
    expect(sharp(wide).style.width).toBe("560px");
    expect(sharp(narrow).style.width).toBe("340px");
    expect((wide.container.firstElementChild as HTMLElement).style.height).toBe("288px");
    expect((narrow.container.firstElementChild as HTMLElement).style.height).toBe("288px");
    // 58% of each width, to the pixel.
    expect(wide.container.innerHTML).toContain("transparent) 325px");
    expect(narrow.container.innerHTML).toContain("transparent) 197px");
    // The flat stop does not derive; each was drawn against its own surface.
    expect(wide.container.innerHTML).toContain("var(--bg) 584px");
    expect(narrow.container.innerHTML).toContain("var(--bg) 356px");
  });

  // One ramp function for both strategies. `flat` is the band whose ink sits
  // beside the portrait rather than over it — a vertical ramp there would darken
  // the row to protect nothing.
  it("ramps a left-portrait band from the same function, and draws none when flat", () => {
    const ramped = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={46} artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    const flat = render(
      <ArtWash strategy="left-portrait" height={288} portrait={560} labelAtPx="flat" artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    expect(ramped.container.querySelectorAll(".art-wash-scrim")).toHaveLength(2);
    expect(ramped.container.innerHTML).toContain("var(--bg) 78%, transparent) 78%");
    expect(flat.container.querySelectorAll(".art-wash-scrim")).toHaveLength(1);
    expect(flat.container.innerHTML).not.toContain("180deg");
  });

  // The ceiling rule, on the shape that replaces the one it was written for.
  it("keeps the reduced opacity a ceiling on a stated band", () => {
    const { container } = render(
      <ArtWash strategy="cover" height={288} labelAtPx={46} artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    const layer = container.querySelector<HTMLElement>(".art-wash-art");
    expect(layer?.style.getPropertyValue("--art-wash-reduced-opacity")).toBe("0.3");
    expect(layer?.style.opacity).toBe("0.8");
  });
});

describe("ArtWash — the inverted portrait", () => {
  // 560 on a 288 band is the one geometry whose width was chosen before its
  // height, and it is the one the crop cannot fill by scaling to the band: a
  // height-scaled crop is 288 × 1.37 = 395px wide, so 165px of a 560px box would
  // be ground with no art in it while the mask and scrim were positioned as
  // though art reached 560.
  it("scales the 560 portrait by its width and the derived ones by the band", () => {
    const sharp = (el: React.ReactElement) => {
      const { container } = render(el);
      return Array.from(container.querySelectorAll<HTMLElement>("div")).find((d) =>
        d.style.maskImage?.includes("90deg"),
      )!;
    };
    const wide = sharp(
      <ArtWash strategy="left-portrait" height={288} portrait={560} labelAtPx="flat" artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    expect(wide.style.backgroundSize).toBe("cover");
    // A1 — the face is at the top of the crop, so a width-driven portrait loses
    // the bottom rather than the middle.
    expect(wide.style.backgroundPosition).toBe("center top");

    // 340 on the same band still fits: 395px of art overhangs a 340px box, so it
    // is filled and masked exactly as every other portrait is.
    const narrow = sharp(
      <ArtWash strategy="left-portrait" height={288} portrait={340} labelAtPx="flat" artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    expect(narrow.style.backgroundSize).toBe("auto 100%");
    expect(narrow.style.backgroundPosition).toBe("left center");
  });

  // The hook a probe reads. On the root, not on a scrim class: the two strategies
  // draw different scrims, so a check keyed to one class silently stops covering
  // the other the moment a row migrates.
  it("marks every band with its own height", () => {
    const stated = render(
      <ArtWash strategy="cover" height={248} labelAtPx={46} artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    expect(stated.container.firstElementChild).toHaveAttribute("data-art-wash-band", "248");

    const statedPortrait = render(
      <ArtWash strategy="left-portrait" height={208} portrait={285} labelAtPx={46} artCropUri="c.jpg" colorIdentity={["G"]} />,
    );
    expect(statedPortrait.container.firstElementChild).toHaveAttribute("data-art-wash-band", "208");

  });

  // The resume row's 99px column, restored with the row. Every figure here is
  // what SHIPPED rather than what the rule derives: 0.95 is the lift the layer
  // took when the ambient copy under it was deleted, and the clear stop is an
  // explicit 58 where `maskEnd%` of 99 would give 61. Nothing else covers this
  // entry — the contrast suite reads its expectations out of the same table, so
  // a wrong value there agrees with itself.
  it("draws the restored resume portrait at its own shipped geometry", () => {
    const { container } = render(
      <ArtWash
        strategy="left-portrait"
        height={72}
        portrait={99}
        labelAtPx="flat"
        artCropUri="c.jpg"
        colorIdentity={["G"]}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe("72px");
    // The row's own ground, not `--bg`: the band sits in a `--surface-inset` row
    // and the art has to fade into that rather than into a darker patch.
    expect(root.style.background).toContain("--surface-inset");

    const sharp = container.querySelector<HTMLElement>(".art-wash-art")!;
    expect(sharp.style.width).toBe("99px");
    expect(sharp.style.opacity).toBe("0.95");
    expect(sharp.style.maskImage).toContain("62%");

    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim")!;
    // The clear run ends at 58, the sharp alpha lands at the portrait's own
    // width, and the ground closes at 138.
    expect(scrim.style.background).toContain("58px");
    expect(scrim.style.background).toContain("99px");
    expect(scrim.style.background).toContain("138px");
    // The fade's ALPHA, independently: the contrast suite reads `sharpAlpha`
    // out of the same table it would be changed in, so its expectations move
    // with any change and a regression there stays green. 80% at the portrait's
    // own width is the figure this row ships.
    expect(scrim.style.background).toContain("--surface-inset) 80%, transparent) 99px");
    // Flat: one scrim, no vertical ramp.
    expect(container.querySelectorAll(".art-wash-scrim")).toHaveLength(1);
  });
});
