"use client";

// A count figure that counts up (small-polish handoff §3, E8). From 0 on a page's first draw, from the old figure when it
// changes; it waits `--motion-delay` (100ms), runs `--motion-duration` (320ms) on `--motion-ease`'s curve, in whole numbers.
//
// Only COUNTS. Never money (a ticking price reads as a meter) and never a percentage: the caller passes the number alone and
// the words around it as `before` and `after` (plain strings, so a server component can render this: no function crosses
// the boundary; `countParts` in `lib/ui/count-parts.ts` cuts a copy string around its number). The number alone moves and the
// text around it, the money after the copies included, stays still. A figure under 10 does not count.
//
// The real figure is in the text from the first render: the moving digits are `aria-hidden` and an `sr-only` twin carries the
// final string, so assistive tech hears one value and never the count in between. The server renders the real figure too
// (no script, no zero); once the page hydrates the digits drop to the start and count, so a first load shows the real figure
// for the moments before hydration and then counts from 0: an accepted flash, since the alternative is a 0 with no script.
// The digits sit in a box as wide as the final figure (in `ch`, which tabular digits make exact), right-aligned, so the
// words around them do not shift as it grows. Reduced motion shows the
// final figure and never animates.

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** The figure at or above which a count counts. */
export const COUNT_UP_MIN = 10;
/** `--motion-delay` and `--motion-duration` in `globals.css`; `count-up.test.tsx` holds them together. */
export const COUNT_UP_DELAY_MS = 100;
export const COUNT_UP_MS = 320;

/** `cubic-bezier(0.45, 0, 0.55, 1)`, `--motion-ease`: the progress of an animation at time `t` (0 to 1). */
export function easeInOut(t: number): number {
  const [x1, y1, x2, y2] = [0.45, 0, 0.55, 1];
  const bez = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 * s + 3 * b * (1 - s) * s ** 2 + s ** 3;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const x = bez(x1, x2, s) - t;
    const dx = 3 * x1 * (1 - s) ** 2 + 6 * (x2 - x1) * (1 - s) * s + 3 * (1 - x2) * s ** 2;
    if (Math.abs(x) < 1e-5 || dx === 0) break;
    s -= x / dx;
  }
  return bez(y1, y2, Math.min(1, Math.max(0, s)));
}

/** The figure as the app writes a count: thousands separators, en-US. */
const format = (n: number) => n.toLocaleString("en-US");

const reduced = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CountUp({ value, before = "", after = "" }: { value: number; before?: string; after?: string }) {
  const [shown, setShown] = useState(value);
  // What the digits showed last, so a change counts from it (and a first draw from 0).
  const last = useRef<number | null>(null);
  const motion = useRef<{ timer: ReturnType<typeof setTimeout> | null; frame: number | null }>({ timer: null, frame: null });

  const stop = () => {
    if (motion.current.timer !== null) clearTimeout(motion.current.timer);
    if (motion.current.frame !== null) cancelAnimationFrame(motion.current.frame);
    motion.current = { timer: null, frame: null };
  };

  useLayoutEffect(() => {
    stop();
    const from = last.current === null ? 0 : last.current;
    if (value < COUNT_UP_MIN || reduced() || from === value) {
      last.current = value;
      setShown(value);
      return stop;
    }
    // Drop to the start before paint, then wait the beat and run.
    setShown(from);
    motion.current.timer = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / COUNT_UP_MS);
        const n = Math.round(from + (value - from) * easeInOut(t));
        setShown(n);
        last.current = n;
        if (t < 1) motion.current.frame = requestAnimationFrame(tick);
        else last.current = value;
      };
      motion.current.frame = requestAnimationFrame(tick);
    }, COUNT_UP_DELAY_MS);
    return stop;
  }, [value]);

  // A tab hidden mid-count: the browser stops the frames, so settle on the figure rather than leave it half-counted.
  useEffect(() => {
    const settle = () => {
      if (document.visibilityState === "hidden") {
        stop();
        last.current = value;
        setShown(value);
      }
    };
    document.addEventListener("visibilitychange", settle);
    return () => document.removeEventListener("visibilitychange", settle);
  }, [value]);

  const whole = `${before}${format(value)}${after}`;
  if (value < COUNT_UP_MIN) return <>{whole}</>;
  return (
    <>
      <span className="sr-only">{whole}</span>
      <span aria-hidden="true" className="tabular-nums">
        {before}
        <span className="inline-block text-end" style={{ minWidth: `${format(value).length}ch` }} data-count-up>
          {format(shown)}
        </span>
        {after}
      </span>
    </>
  );
}
