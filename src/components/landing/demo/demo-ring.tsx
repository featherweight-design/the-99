"use client";
// The press ring (public landing, 5l): the board's accent ring with its 5px halo and a floating label, drawn over the first
// control a step is about. Purely visual: it measures the real control inside the app panel, floats over it and takes no press
// (`pointer-events-none`). A step names its control by a CSS selector (`ringTarget`, demo-rings); nothing found, nothing drawn.

import { useEffect, useState, type RefObject } from "react";

type Box = { left: number; top: number; width: number; height: number };
/** A measured box and the selector it was measured for: a box is drawn only for its own selector, so a step change never shows the last step's rectangle. */
type Measured = { selector: string; box: Box } | null;

/** How far the ring stands off the control it rings, as the board's `-4px` insets do. */
const STAND_OFF = 3;

/**
 * Where the label sits, chosen per step so it never hides readable text:
 * - `top` (the default, for wide targets: rows, tiles, the key): straddles the ring's top edge, about half its height inside
 *   the ring's top border, right-aligned. It stands only ~9px over the ink above (the gap between rows) instead of the whole
 *   line, and the half inside lies in the target's own top padding.
 * - `bottom` (a tab, which sits right under the panel's own label and has its name centered): straddles the bottom edge,
 *   left-aligned, over the gap before the tool's head line, never over the tab's name or the label above it.
 * - `inside`: seats it within the control's top-left corner, for a control with other ink directly above it (a tile under the
 *   legend row).
 */
export type RingPlace = "top" | "bottom" | "inside";

const PLACE: Record<RingPlace, string> = {
  // Half of the 18px label above the border's middle (-1px) and half below: `-10px`.
  top: "right-[10px] top-[-10px]",
  bottom: "bottom-[-10px] left-[10px]",
  inside: "left-[6px] top-[6px]",
};

export function PressRing({ panel, selector, label, place = "top" }: { panel: RefObject<HTMLElement | null>; selector: string | null; label: string; place?: RingPlace }) {
  const [measured, setMeasured] = useState<Measured>(null);

  useEffect(() => {
    const host = panel.current;
    if (!host || !selector) return;
    let watched: Element | null = null;
    const measure = () => {
      const clear = () => setMeasured(null);
      const target = host.querySelector<HTMLElement>(selector);
      // Follow the control itself: a layout shift that changes neither the panel nor its children still moves it.
      if (target !== watched) {
        if (watched) resizeTarget.unobserve(watched);
        watched = target;
        if (target) resizeTarget.observe(target);
      }
      if (!target) return clear();
      const at = host.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (to.width === 0 || to.height === 0) return clear();
      const box = { left: to.left - at.left - host.clientLeft - STAND_OFF, top: to.top - at.top - host.clientTop - STAND_OFF, width: to.width + STAND_OFF * 2, height: to.height + STAND_OFF * 2 };
      setMeasured((prev) => (prev && prev.selector === selector && prev.box.left === box.left && prev.box.top === box.top && prev.box.width === box.width && prev.box.height === box.height ? prev : { selector, box }));
    };
    const resizeTarget = new ResizeObserver(measure);
    // The control may not be drawn yet (art and fonts settle, a list hydrates): measure after paint, and again on any change.
    const frame = requestAnimationFrame(measure);
    const resize = new ResizeObserver(measure);
    resize.observe(host);
    const mutate = new MutationObserver(measure);
    // `aria-selected`: a tab ring follows the tab that is not open, and a press that only flips that attribute moves it.
    mutate.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    // `load` does not bubble: a capturing listener on the host hears every picture inside it settle (and shift the layout).
    host.addEventListener("load", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      resizeTarget.disconnect();
      mutate.disconnect();
      host.removeEventListener("load", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [panel, selector]);

  if (!selector || !measured || measured.selector !== selector) return null;
  const { box } = measured;
  return (
    <span
      aria-hidden
      data-testid="demo-ring"
      className="pointer-events-none absolute z-[6] rounded-[10px] border-2 border-solid border-[color:var(--accent)] shadow-[0_0_0_5px_color-mix(in_oklab,var(--accent)_22%,transparent)]"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      <b className={`absolute whitespace-nowrap ${PLACE[place]} rounded-[5px] bg-[color:var(--accent)] px-[7px] font-sans text-[10.5px] font-semibold leading-[18px] text-[color:var(--bg)]`}>{label}</b>
    </span>
  );
}
