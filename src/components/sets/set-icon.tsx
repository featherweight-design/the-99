// The set symbol, recoloured by mask rather than by fetch.
//
// Scryfall's set SVGs are a bare `<path>` with no `fill`, so they render black on every
// theme — the handoff's assumption that the glyph inherits `currentColor` is false, checked
// against svgs.scryfall.io. A mask sidesteps it: the element's own background is the
// colour, and the SVG only decides which pixels of it show. That serves the --fg-muted
// rest state and the --success ring at 100% by the same mechanism, with no fetch and no
// rewriting of an upstream asset.
//
// Always aria-hidden: the set code beside it is the identifier.

import type { CSSProperties } from "react";

export function SetIcon({
  uri,
  size,
  desktopSize,
  tone = "muted",
  ringed = false,
}: {
  uri: string | null;
  size: number;
  /** When given, `size` is the phone size and this is used from `md` up. */
  desktopSize?: number;
  tone?: "muted" | "success";
  ringed?: boolean;
}) {
  const color = tone === "success" ? "var(--success)" : "var(--fg-muted)";
  const inset = ringed ? 6 : 0;
  // A CSS variable rather than two rendered icons: a desktop copy beside a phone copy
  // would double the element in the tree, and this is one element that resizes.
  const box = desktopSize
    ? ({ "--icon": `${size}px`, "--icon-md": `${desktopSize}px` } as CSSProperties)
    : ({ "--icon": `${size}px`, "--icon-md": `${size}px` } as CSSProperties);

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full
                 w-[var(--icon)] h-[var(--icon)] md:w-[var(--icon-md)] md:h-[var(--icon-md)]"
      style={{
        ...box,
        // At 100% the disc is a ring with no fill; at rest it is a filled plate.
        background: ringed ? "transparent" : "var(--elevated)",
        border: ringed ? `1.5px solid var(--success)` : "none",
      }}
    >
      {uri ? (
        <span
          className="w-[var(--glyph)] h-[var(--glyph)] md:w-[var(--glyph-md)] md:h-[var(--glyph-md)]"
          style={{
            "--glyph": `${size - inset - 8}px`,
            "--glyph-md": `${(desktopSize ?? size) - inset - 8}px`,
            background: color,
            maskImage: `url(${uri})`,
            WebkitMaskImage: `url(${uri})`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: "contain",
            WebkitMaskSize: "contain",
          } as CSSProperties}
        />
      ) : null}
    </span>
  );
}
