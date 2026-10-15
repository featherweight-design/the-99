"use client";

import { useLayoutEffect, useRef } from "react";
import type { FoilFinish } from "../../lib/collection/browse";
import { armArtArrival } from "./hydrated-art";

/**
 * The foil film over art drawn as a CSS BACKGROUND (foil handoff R2): the details faces, the zoom card and the hover
 * preview. A background cannot say that it loaded, and R1's hold reads an `<img>` sibling, so the film carries its
 * own arrival mark: one preloaded Image of the face's own URL (the bytes the face already asks for, so no new
 * request), armed through `armArtArrival` with NO queue (audit G8: a lone face plays on landing, never in a list's
 * reading order). Only this span is marked. The face it lies over is never marked and never waits: the global
 * `[data-arrival="pending"]` rule would hide whatever carries the mark.
 *
 * Marked in a layout effect, so the mark lands before the first paint that could show the film over a face whose
 * bytes are still travelling. The effect's cleanup takes the Image's listeners off and clears the mark, on unmount
 * and whenever the URL moves (a pick, a page).
 *
 * `size="large"` is the details face and the zoom card, which play the band once on open; a foil one draws the same
 * wash as a tile, and an etched one keeps R2's 80% strength and 1.5x spread. The hover preview is a tile film.
 * No finish or no art draws nothing.
 */
export function FoilFilm({ finish, src, size }: {
  finish: FoilFinish | undefined;
  src: string | null | undefined;
  size?: "large";
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const drawn = Boolean(finish && src);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!drawn || !el || !src) return;
    const image = new Image();
    image.src = src;
    return armArtArrival(el, image, null);
  }, [drawn, src]);
  if (!drawn) return null;
  return (
    <span
      ref={ref}
      aria-hidden
      data-testid="foil-film"
      data-foil={finish}
      data-foil-size={size}
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
    />
  );
}
