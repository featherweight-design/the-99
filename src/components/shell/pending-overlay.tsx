"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

import { shellCopy } from "../../lib/copy/shell";
import type { LoadingKey } from "../../lib/shell/pending-routes";
import { LoadingScreen } from "./loading-screen";

/** The fade out's length: `--motion-exit-quick` in `globals.css` (a test holds the two together). */
export const OVERLAY_OUT_MS = 140;

/**
 * The escalation screen (escalation addendum): the target route's `LoadingScreen`, laid over the
 * visible part of a box once a navigation has been pending for 400ms — normally the shell's own
 * `<main>`, or a narrower registered content scope when the run never leaves one (collection tabs
 * overlay fix, #1222 follow-up), so a shared head above that scope stays visible and interactive.
 *
 * A sibling of whichever element it covers, never inside it, because `LoadingScreen` is a
 * `role="status"` live region and that element is marked busy while it shows (audit correction 2).
 * Fixed-position over the box: right of the rail, below the phone header (clamped to 0 once the
 * header scrolls away), and clear of the tab bar and an open About sheet. It blocks pointer events
 * from its first frame, so a press under it goes nowhere; leaving, it lets them through at once and
 * fades out over the new page.
 */
export function PendingOverlay({
  screen,
  leaving,
  box: boxRef,
  onLeft,
}: {
  screen: LoadingKey;
  leaving: boolean;
  box: RefObject<HTMLElement | null>;
  onLeft: () => void;
}) {
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const place = () => {
      const r = el.getBoundingClientRect();
      setBox({ left: r.left, top: Math.max(0, r.top) });
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [boxRef]);

  // Unmount once the fade (`OVERLAY_OUT_MS`) has run. A timer rather than `animationend`, which never fires
  // where animations do not run and would leave the screen up over the new page.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onLeft, OVERLAY_OUT_MS);
    return () => clearTimeout(t);
  }, [leaving, onLeft]);

  return (
    <div
      data-testid="pending-overlay"
      data-leaving={leaving ? "" : undefined}
      className={`fixed right-0 z-[35] flex flex-col bottom-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:bottom-0 ${
        leaving ? "anim-overlay-out pointer-events-none" : "anim-overlay-in"
      }`}
      style={{ left: box?.left ?? 0, top: box?.top ?? 0 }}
    >
      <LoadingScreen copy={shellCopy.loading[screen]} watch={false} />
    </div>
  );
}
