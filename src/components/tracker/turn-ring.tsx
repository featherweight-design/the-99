"use client";

// The turn ring (F03): the panel border, drawn as four paths that start at the middle of the long top and bottom borders
// and trace outward, round the corners, to the middle of each side. Under reduced motion it is simply there (the
// `motion-reduce` classes drop the draw).
//
// The paths are drawn in the panel's own pixels (measured), so `pathLength` and the dash stay exact and the corners
// follow the pane's radius. A stretched 0..100 viewBox with a non-scaling stroke drew the dash short in Chrome, which
// left the ring broken into dashes, and its square corners were clipped by the rounded pane.

import { useLayoutEffect, useRef, useState } from "react";

const STROKE = 2.5;

export function TurnRing({ radius }: { radius: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const path = "stroke-[color:var(--accent)] [stroke-linecap:round] fill-none [stroke-dasharray:1] [stroke-dashoffset:0] animate-[ring-trace_.65s_cubic-bezier(.4,.1,.2,1)_both] motion-reduce:animate-none";
  let d: string[] = [];
  if (size && size.w > 0 && size.h > 0) {
    const i = STROKE / 2;
    const { w, h } = size;
    const r = Math.max(0, Math.min(radius - i, w / 2 - i, h / 2 - i));
    const cx = w / 2;
    const cy = h / 2;
    d = [
      `M${cx} ${i} H${w - i - r} A${r} ${r} 0 0 1 ${w - i} ${i + r} V${cy}`,
      `M${cx} ${h - i} H${w - i - r} A${r} ${r} 0 0 0 ${w - i} ${h - i - r} V${cy}`,
      `M${cx} ${i} H${i + r} A${r} ${r} 0 0 0 ${i} ${i + r} V${cy}`,
      `M${cx} ${h - i} H${i + r} A${r} ${r} 0 0 1 ${i} ${h - i - r} V${cy}`,
    ];
  }
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      data-testid="turn-ring"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={size ? `0 0 ${size.w} ${size.h}` : undefined}
    >
      {d.map((p, n) => (
        <path key={n} pathLength="1" strokeWidth={STROKE} className={path} d={p} />
      ))}
    </svg>
  );
}
