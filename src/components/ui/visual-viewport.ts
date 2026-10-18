// Keyboard framing for the phone's modals (Hugh's modal rule, part D).
//
// dvh tracks the browser's toolbars, not the keyboard. On iOS Safari and default Android Chrome an open
// keyboard shrinks or pans only the VISUAL viewport and leaves the layout one (`vh`, `dvh`, `inset-0`,
// `bottom-0`) alone, so a phone sheet sized and anchored against the layout viewport keeps its lower rows,
// and its actions, behind the keyboard. The visible part of the window is `visualViewport`'s `offsetTop`
// and `height`, measured again on its resize and scroll; this hook hands them to CSS as `--vv-top` and
// `--vv-h` on the element that takes its style, and the phone classes below read them (desktop reads
// neither). With no visual viewport, or before the first measure, nothing is set and every class falls
// back to the layout viewport, which is what the shell drew before.
//
// SocialModal's frame was the first (Social R1); every input-bearing phone shell now takes it from here.
// src/components/ui/modal-shells.test.ts checks each one does.

import { useLayoutEffect, useState, type CSSProperties } from "react";

/**
 * The visual viewport as `--vv-top` and `--vv-h`, for a `style` prop, while `active` (a closed sheet listens to
 * nothing). Undefined when inactive or when the browser has no `visualViewport`.
 */
export function useVisualViewportFrame(active = true): CSSProperties | undefined {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const measure = () =>
      setBox((prev) => (prev && prev.top === vv.offsetTop && prev.height === vv.height ? prev : { top: vv.offsetTop, height: vv.height }));
    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, [active]);
  return active && box ? ({ "--vv-top": `${box.top}px`, "--vv-h": `${box.height}px` } as CSSProperties) : undefined;
}

/**
 * A `fixed inset-0` frame made the visible window on the phone: its top at the visual viewport's, its height
 * the visual viewport's. A bottom-anchored panel inside it (`justify-end`, `items-end`) then sits on the keyboard.
 */
export const VV_FRAME = "max-md:bottom-auto max-md:top-[var(--vv-top,0px)] max-md:h-[var(--vv-h,100%)]";

/**
 * `VV_FRAME` held to the compact filter stop (999px), for a sheet that is still a bottom sheet past `md`: the deck
 * filter sheet, and the set list it opens from the collection and rack filters. A tablet keyboard covers it too.
 */
export const VV_FRAME_COMPACT = "max-[999px]:bottom-auto max-[999px]:top-[var(--vv-top,0px)] max-[999px]:h-[var(--vv-h,100%)]";

/**
 * A `fixed bottom-0` panel with no frame, lifted on the phone to the visual viewport's bottom: the layout
 * viewport's height (`100%` of a fixed box's containing block) less the visible window's top and height.
 */
export const VV_BOTTOM = "max-md:bottom-[calc(100%_-_var(--vv-top,0px)_-_var(--vv-h,100%))]";
