"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { cssUrl } from "../../lib/collection/browse";
import { useArrivalQueue } from "./arrival-queue";
import { armArtArrival, useNearViewport } from "./hydrated-art";

/**
 * An art-wash layer that asks for its crop only once the page has hydrated and the layer is within
 * 600px of the viewport. A CSS background is fetched for every rendered element, on screen or not,
 * so a list that draws its art eagerly spends the slow link on art the reader cannot see while the
 * page's own script waits behind it. The layer keeps its box and style throughout: before the crop
 * arrives the band's plate shows, exactly as it does while an eager crop is still loading.
 *
 * A background has no load event, so a preloaded Image of the same source stands in for one: the
 * layer fades in when it lands, or draws at once when the crop is already cached (`armArtArrival`).
 * The Image and the background are asked for in the same commit, so the fade adds no wait of its own.
 */
export function NearViewportArt({ src, className, style, margin }: { src: string; className: string; style: CSSProperties; margin?: string }) {
  return <ArrivingArt src={src} className={className} style={style} defer margin={margin} />;
}

/**
 * Every crop a layer has asked for in this page's life. A deferred layer whose crop is here draws it
 * at once rather than waiting on the observer again, so a list restored by Back, or re-sorted under
 * the reader, never blanks art it has already drawn. Held under a registered symbol so the test setup
 * can empty it between tests without importing this module (vitest.setup.ts).
 */
const ASKED_FOR = Symbol.for("the99.artAskedFor");
const askedFor: Set<string> = ((globalThis as Record<symbol, Set<string>>)[ASKED_FOR] ??= new Set());

/**
 * An art-wash layer whose crop fades in when it lands (`armArtArrival`). `defer` waits for the page
 * to hydrate and the layer to near the viewport before asking for it; without it the crop is in the
 * server HTML, and a crop already painted when the page hydrates is left as it is.
 */
export function ArrivingArt({
  src, className, style, defer = false, margin,
}: { src: string; className: string; style: CSSProperties; defer?: boolean; margin?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const near = useNearViewport(ref, defer && !askedFor.has(src), margin);
  const shown = !defer || near || askedFor.has(src);
  const queue = useArrivalQueue();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!shown || !el) return;
    askedFor.add(src);
    const image = new Image();
    image.src = src;
    return armArtArrival(el, image, queue);
  }, [shown, src, queue]);
  return <div ref={ref} className={className} style={shown ? { ...style, backgroundImage: cssUrl(src) } : style} />;
}
