"use client";

// The firefly's start point (`.ai-sweep`, globals.css). A conic gradient's 0deg is the top CENTER of its box, and the lap
// starts at the top-RIGHT corner (Hugh, 2026-10-13), whose angle from the top, clockwise, is atan2(width, height)
// for the box's own aspect: 76deg on a 4:1 band, 27deg on a tall 1:2 one, 45deg only on a square. CSS cannot read
// the host's height without size containment (which would collapse an auto-height card), so the host reports its
// own box here, as `--ai-sweep-start`, and the stylesheet's own 45deg stands until it has measured.
import { useCallback, useRef } from "react";

/** A callback ref for the host of an `.ai-sweep`. It is safe above an early return: it observes whatever it is attached to. */
export function useAiSweepRef() {
  const observer = useRef<ResizeObserver | null>(null);
  return useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) el.style.setProperty("--ai-sweep-start", `${(Math.atan2(width, height) * 180) / Math.PI}deg`);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(measure);
    observer.current.observe(el);
  }, []);
}
