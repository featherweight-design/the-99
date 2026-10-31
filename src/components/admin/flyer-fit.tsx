"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scales the 816 px flyer to the width it has on a screen (the board draws it at .75 on desktop; a phone is narrower).
 * The stylesheet's own `--s` (.75 from 768 px, .42 below) paints first; this refines it to fit the mat exactly, never
 * above .75. Print ignores it (`print.css` lays the sheet out at 1:1). `dimmed` is a revoked code's flyer: shown faded on
 * screen, and not printed at all.
 */
export function FlyerFit({ children, dimmed = false }: { children: ReactNode; dimmed?: boolean }) {
  const mat = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mat.current;
    if (!el) return;
    const fit = () => {
      const style = getComputedStyle(el);
      const room = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (room > 0) el.style.setProperty("--s", String(Math.min(0.75, room / 816)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={mat} className="flyer-mat">
      <div className={dimmed ? "flyer-fit flyer-fit-dim" : "flyer-fit"} data-dimmed={dimmed || undefined}>{children}</div>
    </div>
  );
}
