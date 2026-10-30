"use client";

import { useEffect, type RefObject } from "react";

/**
 * A textarea that grows with its words (no resize handle: the boards draw none). The height is set to the field's own
 * `scrollHeight` whenever `text` changes, and again when the field's box changes size (a rotation, a resize, a late
 * font), or the height goes stale and clips. A CSS `min-height` still floors it. jsdom reports a 0 `scrollHeight`, so
 * the height is never written there and the field keeps its CSS size.
 */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, text: string): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const grow = () => {
      el.style.height = "auto";
      if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
    };
    grow();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", grow);
      return () => window.removeEventListener("resize", grow);
    }
    const observer = new ResizeObserver(grow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, text]);
}
