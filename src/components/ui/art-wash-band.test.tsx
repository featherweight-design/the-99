import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtWash } from "./art-wash";

// jsdom computes no layout, so this asserts the declaration rather than the
// rendered box: the root must state its own band, which is what stops the sharp
// layer's `auto 100%` resolving against a row that happens to be taller.
describe("ArtWash — left-portrait band geometry", () => {
  it.each([
    [288, 560],
    [288, 340],
    [208, 285],
    [168, 230],
  ] as const)("states its own %ipx band, not its parent's height", (height, portrait) => {
    const { container } = render(
      <div style={{ height: 400 }}>
        <ArtWash
          strategy="left-portrait"
          height={height}
          portrait={portrait}
          labelAtPx="flat"
          artCropUri="https://example.test/a.jpg"
          colorIdentity={["G"]}
        />
      </div>,
    );
    const root = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(root.style.height).toBe(`${height}px`);
  });
});
