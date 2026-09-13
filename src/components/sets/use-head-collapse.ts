"use client";

// The phone head's two heights, and everything that decides between them.
//
// R3 finding 6 gave the set page's `sticky top-0` head a second, shorter form past a scroll
// threshold. The MARKUP for that lives in `set-grid-view.tsx`, where the members it hides
// are; what lives here is the mechanism — the threshold, the gates that forbid a collapse,
// the measurement of the open height and the spacer that holds it in the document.
//
// Extracted because that is where the defects were. Finding 6 took twelve review rounds and
// every one of them was in this state machine: the hysteresis band, the reserve, the
// `ResizeObserver`'s delivery timing, the delta gate, the sheet freeze, the breakpoint
// round trip. None was in the JSX. Extracting the head itself was measured first and
// rejected — it reads ~44 values from its component, so the boundary would be nominal.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type HeadCollapse = {
  /** True when the collapsed bar should be drawn in place of the open head. */
  shy: boolean;
  /** Goes on the sticky head. Its height is what the reserve is measured from. */
  headRef: React.RefObject<HTMLDivElement | null>;
  /** Goes on the always-mounted spacer BESIDE the head, never wrapping it. */
  spacerRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Open the head now, without waiting for a scroll event.
   *
   * The collapsed bar's search control needs this: the field it stands for is inside the
   * `display:none` open subtree while the bar is drawn, so scrolling to the top and calling
   * `focus()` focused a hidden input and did nothing. The state has to commit first.
   *
   * Exposed as an action rather than by handing back the setter, so the one place that owns
   * this state machine stays the one place that can move it.
   */
  openHead: () => void;
};

/**
 * @param isDesktop  Desktop never collapses: same container, full form, `md:` untouched.
 * @param deltaFiring §31, verbatim: "if it is firing, the collapse waits". The delta strip
 *   is the one member of the head that is news rather than reference, and it carries the
 *   only offer to refresh a page the reader has just been told is stale.
 * @param sheetOpen  An open filter sheet FREEZES the head in whichever state it is already
 *   in. Not "forces it open" — opened from the collapsed bar, forcing it open unmounts the
 *   trigger `useDialogA11y` returns focus to, which is the defect being avoided arriving
 *   from the other side.
 */
export function useHeadCollapse({
  isDesktop,
  deltaFiring,
  sheetOpen,
}: {
  isDesktop: boolean;
  deltaFiring: boolean;
  sheetOpen: boolean;
}): HeadCollapse {
  const [collapsed, setCollapsed] = useState(false);

  /**
   * A breakpoint crossing reopens the head.
   *
   * A reader who collapses on the phone, widens to desktop and comes back is still
   * `collapsed`, so the head is shy on the first mobile render — and the recorder, which
   * refuses to measure a collapsed head, leaves the DESKTOP height reserved underneath it.
   * Clearing the recorded height instead was tried and measured worse: the reserve goes to
   * 0 where the desktop figure was accidentally within 3px of right.
   *
   * Adjusted DURING RENDER, which is React's supported pattern for deriving state from a
   * changed input.
   */
  const [seenDesktop, setSeenDesktop] = useState(isDesktop);
  if (seenDesktop !== isDesktop) {
    setSeenDesktop(isDesktop);
    if (collapsed) setCollapsed(false);
  }

  // `sheetOpen` is deliberately NOT a term here. It was, and that made this flip in the very
  // render the sheet opened — so the freeze below captured the value AFTER the change it
  // exists to prevent. This expression says what would be true without the sheet; the
  // freeze holds whatever was true when it opened.
  const mayCollapse = !isDesktop && !deltaFiring;

  useEffect(() => {
    if (!mayCollapse) return;
    // An open sheet freezes the head: the listener stands down and `collapsed` holds.
    if (sheetOpen) return;
    const onScroll = () => {
      const y = window.scrollY;
      // Read as a function of the CURRENT state, which is what makes this hysteresis rather
      // than two thresholds: collapsed stays collapsed until 40, open stays open until 120,
      // and between the two nothing happens. Never interpolated with the scroll offset — a
      // head that tracked it would be permanently in motion under the thing being read.
      setCollapsed((was) => (was ? y > 40 : y > 120));
    };
    // The first read is here, in a passive effect, so a reload at scrollY > 120 paints the
    // open head for one frame before collapsing. Moving it to a layout effect is what the
    // shape asks for and `react-hooks/set-state-in-effect` forbids outright; deriving it
    // during render would read `window.scrollY` on the server and mismatch on hydration.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mayCollapse, sheetOpen]);

  const headRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const restHeightRef = useRef<number | null>(null);

  /**
   * The spacer's height, written to the DOM rather than held in state.
   *
   * State arrives a commit late: on the render where the collapse lands the head has already
   * shrunk while a state-held measurement is still the open one, so the spacer paints at 0
   * and the document jumps once — on the first crossing, which is the only crossing anyone
   * notices.
   *
   * A `useCallback` with no dependencies rather than a `useRef(...).current`: it reads refs
   * only, so it never needs rebuilding, and inside a hook the ref-access rule cannot tell a
   * `.current` read in a stored closure from one during render.
   */
  const sizeSpacer = useCallback(() => {
    const el = headRef.current;
    const spacer = spacerRef.current;
    if (el === null || spacer === null) return;

    // Read off the DOM at call time rather than off a `collapsed` closed over anywhere:
    // `ResizeObserver` delivers at the end of a frame, so the shrink the collapse causes can
    // arrive BEFORE any cleanup, and the rest height would then record the collapsed one —
    // the number it must never hold.
    //
    // Refreshed here, before sizing, whenever the head is open. While collapsed the open
    // subtree is `display:none` and cannot resize, so a filter changed through the sheet
    // leaves the recorded height stale and the first render that restores would size the
    // spacer from a head that no longer exists.
    //
    // The STEADY-STATE height: the head as measured, less whatever the delta strip occupies.
    // Skipping the measurement while the strip fires has a hole — the sheet can still edit
    // the filters behind it — and storing a delta-inclusive height leaves the spacer too
    // tall once the message clears. Subtracting satisfies both.
    if (!el.hasAttribute("data-set-head-collapsed")) {
      const delta = el.querySelector("[data-set-delta]");
      restHeightRef.current = el.getBoundingClientRect().height
        - (delta === null ? 0 : delta.getBoundingClientRect().height);
    }
    const rest = restHeightRef.current;
    spacer.style.height = rest === null
      ? "0px"
      : `${Math.max(0, rest - el.getBoundingClientRect().height)}px`;
  }, []);

  useEffect(() => {
    const el = headRef.current;
    if (el === null) return;
    // `sizeSpacer` records the height as well as writing the spacer, and it is the one place
    // that decides WHEN a height may be recorded. This callback used to keep its own copy of
    // that decision and the two drifted the moment a second condition was added.
    const measure = () => sizeSpacer();
    measure();
    // Guarded, as `top-off-list.tsx` guards its own measured bar: an unconditional
    // constructor throws on mount in any engine without the API. The `measure()` above has
    // already run, so the reserve is correct for the head as it stands.
    if (typeof ResizeObserver === "undefined") return;
    // The head's open height is not a constant: a two-line title, the delta strip and the
    // cost strip's expanded form all move it.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sizeSpacer]);

  const wantShy = collapsed && mayCollapse;

  /**
   * The freeze. An open sheet gets the answer that was true when it opened, and holds it
   * against a delta that starts underneath it as well as against scroll.
   */
  const [shyAtSheetOpen, setShyAtSheetOpen] = useState<boolean | null>(null);
  if (sheetOpen && shyAtSheetOpen === null) setShyAtSheetOpen(wantShy);
  if (!sheetOpen && shyAtSheetOpen !== null) setShyAtSheetOpen(null);
  const shy = sheetOpen && shyAtSheetOpen !== null ? shyAtSheetOpen : wantShy;

  useLayoutEffect(() => {
    sizeSpacer();
    // Keyed, not every render. Without a list this ran after every keystroke in the search
    // field and every modal update, each one forcing a synchronous `getBoundingClientRect`
    // for a head whose size had not moved. The `ResizeObserver` covers ordinary size
    // changes; this covers the transitions it cannot see.
  }, [shy, deltaFiring, isDesktop, sizeSpacer]);

  return { shy, headRef, spacerRef, openHead: () => setCollapsed(false) };
}
