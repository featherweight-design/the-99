import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtWash } from "./art-wash";

// The handoff derives the portrait's width, its mask edge and every horizontal
// scrim stop from band *height* in px. jsdom computes no layout, so this asserts
// the declaration rather than the rendered box: the root must state the band
// itself, which is what stops the sharp layer's `auto 100%` resolving against a
// row that happens to be taller.
describe("ArtWash — left-portrait band geometry", () => {
  it.each([148, 72] as const)("states its own %ipx band, not its parent's height", (band) => {
    const { container } = render(
      <div style={{ height: 400 }}>
        <ArtWash
          strategy="left-portrait"
          band={band}
          artCropUri="https://example.test/a.jpg"
          colorIdentity={["G"]}
        />
      </div>,
    );
    const root = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(root.style.height).toBe(`${band}px`);
  });
});
