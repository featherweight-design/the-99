"use client";

import type { CSSProperties } from "react";
import { ArrivingArt } from "./art-wash-near";

/**
 * Card art drawn as a CSS background, as a layer of its own that fades in when it lands (card-art fades plan,
 * PR 1). A background cannot report that it loaded, so `ArrivingArt` stands a preloaded Image beside it and
 * marks the layer through `armArtArrival`: `pending` while the bytes travel, the one `art-in` fade when they
 * land, and `done` (no fade, nothing hidden) when the art was already cached, painted before hydration, or
 * re-rendered. A pending layer is `opacity: 0`, which is why the art is its own layer and never the host's
 * background: a host with text inside would hide the text with it.
 *
 * The layer fills its host (`absolute inset-0`), so the host is `relative` and clips it (`overflow-hidden`,
 * with its own radius), and keeps its ground color under the art: the plate shows while the art travels,
 * as it did when the art was the host's own background. Inside an `ArrivalOrder` list the fade waits its turn
 * in reading order; anywhere else it plays on landing. Reduced motion shows the art as it lands, unfaded.
 */
export function ArtLayer({ src, className = "", style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    <ArrivingArt
      src={src}
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{ backgroundSize: "cover", backgroundPosition: "center", ...style }}
    />
  );
}
