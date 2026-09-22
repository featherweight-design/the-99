import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComboGlyph, COMBO_GLYPH_PX } from "./combo-glyph";

/**
 * THE GLYPH IS THE CANVAS'S, not a reading of the words about it.
 *
 * The first version of this component was hand-authored from the prose spec — "stroked, 16px
 * viewBox, stroke-width 1.8, linecap round" — without checking whether the handoff carried a
 * path. It carried one, seven times. Four arcs with the wrong sweep flags drew a pretzel
 * instead of a figure eight, and every test on this feature passed over it: a path is a string,
 * and nothing was comparing it to anything.
 *
 * This reads the handoff and compares. It is the only check in the repo that can tell a
 * plausible glyph from the right one.
 */
const CANVAS =
  "design/design_handoff_the99_combo_awareness/The 99 - Combo Awareness.dc.html";

describe("ComboGlyph", () => {
  it("draws the path the design canvas draws", () => {
    // The repo root, from this file: src/components/cards -> up three. `import.meta.url`
    // rather than `__dirname`, which is this repo's ESM convention.
    const here = dirname(fileURLToPath(import.meta.url));
    const html = readFileSync(join(here, "..", "..", "..", CANVAS), "utf8");
    const paths = [...html.matchAll(/d="(M5\.2 4\.9[^"]+)"/g)].map((m) => m[1]);
    expect(paths.length, "the canvas no longer carries the lemniscate").toBeGreaterThan(0);

    const { container } = render(<ComboGlyph />);
    const drawn = container.querySelector("path")!.getAttribute("d");
    expect(drawn, "the drawn path is not the canvas's").toBe(paths[0]);
  });

  it("keeps the canvas's stroke and cap", () => {
    const { container } = render(<ComboGlyph />);
    const path = container.querySelector("path")!;
    expect(path.getAttribute("stroke-width")).toBe("1.8");
    expect(path.getAttribute("stroke-linecap")).toBe("round");
    expect(path.getAttribute("fill")).toBe("none");
  });

  // 12px on every host, 16 in the modal. Both figures are the spec by name.
  it("defaults to the host size and takes the modal's", () => {
    const { rerender } = render(<ComboGlyph />);
    expect(screen.getByTestId("combo-glyph").getAttribute("width")).toBe(
      String(COMBO_GLYPH_PX),
    );
    rerender(<ComboGlyph size={16} />);
    expect(screen.getByTestId("combo-glyph").getAttribute("width")).toBe("16");
  });
});
