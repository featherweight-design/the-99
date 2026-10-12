"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ImgHTMLAttributes, type RefObject } from "react";

/**
 * Card art that waits for the page to hydrate.
 *
 * On a slow connection every image a page asks for competes with the app's own JavaScript for the
 * one link, and card art is by far the largest thing a list asks for: /discover's first window of
 * art crops is ~1.6MB, /collection's grid ~2.4MB, against ~0.5MB of script. Measured on the slow
 * profile at 390, that art held /discover's hydration at 14.2s; asking for it only after hydration,
 * near the viewport, with the first rows eager, brought hydration to 6.8s and the first art from
 * 9.2s to 4.8s. The reader cannot press anything until the page has hydrated, so art below the
 * first viewport waits until the page is usable; the first viewport keeps its art eager, because
 * that is what the reader sees while the page loads.
 *
 * A surface decides which of its items are `eager` (the first viewport's, by index) and gates the
 * rest through `useNearViewport`, or `HydratedImg` for an <img>. Neither needs `useHydrated` to wait:
 * the observer starts in an effect, and no effect runs before hydration commits, so an item is never
 * near in the server HTML. `useHydrated` is for a value read during render.
 */

const subscribe = () => () => {};

/**
 * False on the server and through hydration, true on the render after it. A `useSyncExternalStore`
 * with a no-op subscribe: its server snapshot is what React hydrates against, so the swap is one
 * post-hydration render, with no effect and no hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * True once `ref`'s element has come within `margin` of the viewport, and stays true. For art
 * gated after hydration that should also wait until its row is near: a list's window can hold far
 * more rows than a screen, and hydration alone would ask for all of them at once.
 */
export function useNearViewport(ref: RefObject<Element | null>, enabled: boolean, margin = "600px 0px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || near || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled, near, margin]);
  // No observer to ask (an old engine, a test environment): load rather than never load. Read only
  // once hydrated, because the server has no observer either, and a src there is the fetch this waits on.
  const hydrated = useHydrated();
  return near || (enabled && hydrated && typeof IntersectionObserver === "undefined");
}

/**
 * How deferred art arrives (motion plan E4). `armArtArrival` marks `el` with `data-art="pending"`
 * while `image`'s bytes are on their way, `in` for the one fade when they land (or fail: a broken
 * image is not held behind a fade that never ends), and `done` when `image` had already settled the
 * moment its source was set, so cached art on a revisit is drawn at once rather than faded. The CSS
 * hides `pending` and plays `in` only under `prefers-reduced-motion: no-preference` (and an art-wash
 * layer under reduced transparency, whose opacity is fixed, appears without the fade). Written to the
 * DOM from a layout effect rather than rendered: the server HTML carries no mark, so art is visible
 * without script, and the mark lands before the first paint that could show the source. Eager art
 * never takes it: it is the first viewport, the image a slow page paints first, and holding it at
 * opacity 0 would hold back the largest paint.
 */
export function armArtArrival(el: HTMLElement, image: HTMLImageElement): () => void {
  // Complete when its source is set means settled already: drawn from the cache, or already broken,
  // and a broken one would fire nothing more to release it.
  if (image.complete) {
    el.dataset.art = "done";
    return () => {};
  }
  el.dataset.art = "pending";
  const land = () => {
    if (el.dataset.art === "pending") el.dataset.art = "in";
  };
  image.addEventListener("load", land);
  image.addEventListener("error", land);
  return () => {
    image.removeEventListener("load", land);
    image.removeEventListener("error", land);
  };
}

/**
 * An <img> whose `src` and `srcSet` are withheld until the page has hydrated AND the img has come
 * within 600px of the viewport, unless `eager`, which asks for them in the server HTML. A `srcSet`
 * left on the element would let the browser pick and fetch a candidate with no `src` at all, past
 * both gates. Everything else passes through, so a surface keeps its own box: before its source arrives the img still takes its size,
 * and the ground behind it shows. A deferred img fades in when it loads (`armArtArrival`).
 */
export function HydratedImg({ eager = false, src, srcSet, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement> & { eager?: boolean }) {
  const ref = useRef<HTMLImageElement | null>(null);
  const near = useNearViewport(ref, !eager);
  const show = eager || near;
  const fades = near && !eager && Boolean(src || srcSet);
  useLayoutEffect(() => {
    const img = ref.current;
    if (!fades || !img) return;
    return armArtArrival(img, img);
  }, [fades]);
  // eslint-disable-next-line @next/next/no-img-element -- card art is a remote Scryfall image drawn at the size the surface gives it
  return <img ref={ref} alt={alt} src={show ? src : undefined} srcSet={show ? srcSet : undefined} {...rest} />;
}
