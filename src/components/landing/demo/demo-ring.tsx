"use client";
// The press ring (public landing, 5l): the board's accent ring with its 5px halo and a floating label, drawn over the first
// control a step is about. Purely visual: it measures the real control inside the app panel, floats over it and takes no press
// (`pointer-events-none`). A step names its control by a CSS selector (`ringTarget`, demo-steps); nothing found, nothing drawn.

import { useEffect, useState, type RefObject } from "react";

type Box = { left: number; top: number; width: number; height: number };

/** How far the ring stands off the control it rings, as the board's `-4px` insets do. */
const STAND_OFF = 3;

export function PressRing({ panel, selector, label }: { panel: RefObject<HTMLElement | null>; selector: string | null; label: string }) {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const host = panel.current;
    if (!host || !selector) return;
    const measure = () => {
      const target = host.querySelector<HTMLElement>(selector);
      if (!target) return setBox(null);
      const at = host.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (to.width === 0 || to.height === 0) return setBox(null);
      const next = { left: to.left - at.left - host.clientLeft - STAND_OFF, top: to.top - at.top - host.clientTop - STAND_OFF, width: to.width + STAND_OFF * 2, height: to.height + STAND_OFF * 2 };
      setBox((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height ? prev : next));
    };
    // The control may not be drawn yet (art and fonts settle, a list hydrates): measure after paint, and again on any change.
    const frame = requestAnimationFrame(measure);
    const resize = new ResizeObserver(measure);
    resize.observe(host);
    const mutate = new MutationObserver(measure);
    mutate.observe(host, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutate.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [panel, selector]);

  if (!selector || !box) return null;
  return (
    <span
      aria-hidden
      data-testid="demo-ring"
      className="pointer-events-none absolute z-[6] rounded-[10px] border-2 border-solid border-[color:var(--accent)] shadow-[0_0_0_5px_color-mix(in_oklab,var(--accent)_22%,transparent)]"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      <b className="absolute right-[-6px] top-[-24px] whitespace-nowrap rounded-[5px] bg-[color:var(--accent)] px-[7px] font-sans text-[10.5px] font-semibold leading-[18px] text-[color:var(--bg)]">{label}</b>
    </span>
  );
}
