"use client";

import { useRef, type CSSProperties } from "react";
import { useNearViewport } from "./hydrated-art";

/**
 * An art-wash layer that asks for its crop only once the page has hydrated and the layer is within
 * 600px of the viewport. A CSS background is fetched for every rendered element, on screen or not,
 * so a list that draws its art eagerly spends the slow link on art the reader cannot see while the
 * page's own script waits behind it. The layer keeps its box and style throughout: before the crop
 * arrives the band's plate shows, exactly as it does while an eager crop is still loading.
 */
export function NearViewportArt({ uri, className, style }: { uri: string; className: string; style: CSSProperties }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const near = useNearViewport(ref, true);
  return <div ref={ref} className={className} style={near ? { ...style, backgroundImage: uri } : style} />;
}
