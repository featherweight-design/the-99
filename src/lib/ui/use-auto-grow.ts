"use client";

import { useEffect, type RefObject } from "react";

/**
 * A textarea that grows with its words (no resize handle: the boards draw none). The height is set to the field's own
 * `scrollHeight` whenever `text` changes, and again when the field's box changes size (a rotation, a resize, a late
 * font), or the height goes stale and clips. A CSS `min-height` still floors it, and a CSS `max-height` still caps it
 * (the field then scrolls). A field whose layout reports a 0 `scrollHeight` (jsdom, or `display: none`) is left exactly
 * as it was: no inline height is written, not even the `auto` used to measure, so its CSS size stands.
 *
 * `mounted` is for a field drawn only in one state (an editor opened in place): the effect must run again when the
 * field mounts, which the words alone may not mark (an editor that opens on the words it already had).
 */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, text: string, mounted = true): void {
  useEffect(() => {
    const el = ref.current;
    if (!mounted || !el) return;
    const grow = () => {
      if (el.scrollHeight === 0) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    grow();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", grow);
      return () => window.removeEventListener("resize", grow);
    }
    const observer = new ResizeObserver(grow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, text, mounted]);
}
