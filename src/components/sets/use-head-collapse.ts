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

/**
 * Honoured for the height change, as every other motion in this app is. A reader who has
 * asked for no motion gets the two heights and the step between them, with nothing drawn in
 * between.
 */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * How far past the reopen point the reader has to be before the head collapses. The band is
 * what stops a head one pixel either side of a single threshold flipping on every frame of a
 * slow scroll; 80 is the width the fixed 40/120 pair had.
 */
const HYSTERESIS_PX = 80;

/**
 * The collapse and the restore, in ms. §31 asks for two heights, not for a head that tracks
 * the scroll — this animates the step between them and nothing else, so the head is still at
 * rest in both states and in motion only across the change.
 */
const COLLAPSE_MS = 180;

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

  const headRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const restHeightRef = useRef<number | null>(null);
  /** The collapsed bar's height, measured the same way and only while it is drawn. */
  const barHeightRef = useRef<number | null>(null);
  /**
   * True only between the start of a height transition and its end. Every measurement is
   * off limits while it is: mid-animation the head is whatever pixel the transition has
   * reached, and recording that as the rest height leaves the spacer reserving a head that
   * existed for one frame.
   */
  const animatingRef = useRef(false);
  /**
   * The head's height as it last stood, refreshed on every measurement. The transition needs
   * where the head is coming FROM, and by the time a layout effect can ask, the swap has
   * already happened in that same commit — the head is already the height it is going to.
   */
  const lastHeightRef = useRef<number | null>(null);

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
    if (animatingRef.current) {
      // Size the spacer from the height the head has RIGHT NOW — that is what keeps the
      // document still while it grows or shrinks — but record nothing from it.
    } else if (el.hasAttribute("data-set-head-collapsed")) {
      // Recorded here as well as in the scroll handler: a collapse can land without a scroll
      // — the sheet's freeze releasing, a breakpoint trip — and the threshold wants the bar
      // it is actually drawing.
      barHeightRef.current = el.getBoundingClientRect().height;
    } else {
      const delta = el.querySelector("[data-set-delta]");
      restHeightRef.current = el.getBoundingClientRect().height
        - (delta === null ? 0 : delta.getBoundingClientRect().height);
    }
    const rest = restHeightRef.current;
    spacer.style.height = rest === null
      ? "0px"
      : `${Math.max(0, rest - el.getBoundingClientRect().height)}px`;
    if (!animatingRef.current) lastHeightRef.current = el.getBoundingClientRect().height;
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

  // Placed after the recorder above, not before it: the thresholds below are read off the
  // measurements it writes, and a ref an effect reads may not be written by anything declared
  // later (`react-hooks/immutability`).
  useEffect(() => {
    if (!mayCollapse) return;
    // An open sheet freezes the head: the listener stands down and `collapsed` holds.
    if (sheetOpen) return;
    const onScroll = () => {
      const y = window.scrollY;
      // Where the reserve starts showing. The spacer holds the open head's height in the
      // document while the collapsed bar draws in its place, so above this offset the band
      // between the bar's bottom edge and the grid is empty — the head has to be open again
      // by then, or the reader scrolls up into nothing and watches it pop open underneath
      // them. The grid's own top, less the bar that covers it: measured rather than guessed,
      // because the open head is one line taller with a wrapped title and a constant that
      // fits one set fits the next by luck.
      //
      // Both figures are read HERE rather than taken from what a commit last recorded. The
      // spacer's bottom edge is where the grid starts whichever form the head is in, and the
      // bar's height is refreshed off the bar itself every time one is drawn — a cached
      // figure is only as fresh as the render that wrote it, and a threshold that waits a
      // commit for its input answers the first scroll after a collapse with the old one.
      //
      // Both fall back to the fixed 40/120 pair they replace: before any collapse there is
      // no bar to measure, and an engine that lays nothing out reports 0 for every box.
      const head = headRef.current;
      const spacer = spacerRef.current;
      if (head !== null && !animatingRef.current
        && head.hasAttribute("data-set-head-collapsed")) {
        barHeightRef.current = head.getBoundingClientRect().height;
      }
      const gridTop = spacer === null
        ? null
        : spacer.getBoundingClientRect().bottom + window.scrollY;
      const bar = barHeightRef.current;
      const reopenAt = gridTop === null || bar === null || gridTop <= 0 || bar <= 0
        ? 40
        : Math.max(0, gridTop - bar);
      // Read as a function of the CURRENT state, which is what makes this hysteresis rather
      // than two thresholds: collapsed stays collapsed until the reserve would show, open
      // stays open until a band past it, and between the two nothing happens. Never
      // interpolated with the scroll offset — a head that tracked it would be permanently in
      // motion under the thing being read.
      setCollapsed((was) => (was ? y > reopenAt : y > reopenAt + HYSTERESIS_PX));
    };
    // The first read is here, in a passive effect, so a reload at scrollY > 120 paints the
    // open head for one frame before collapsing. Moving it to a layout effect is what the
    // shape asks for and `react-hooks/set-state-in-effect` forbids outright; deriving it
    // during render would read `window.scrollY` on the server and mismatch on hydration.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mayCollapse, sheetOpen]);

  const wantShy = collapsed && mayCollapse;

  /**
   * The freeze. An open sheet gets the answer that was true when it opened, and holds it
   * against a delta that starts underneath it as well as against scroll.
   */
  const [shyAtSheetOpen, setShyAtSheetOpen] = useState<boolean | null>(null);
  if (sheetOpen && shyAtSheetOpen === null) setShyAtSheetOpen(wantShy);
  if (!sheetOpen && shyAtSheetOpen !== null) setShyAtSheetOpen(null);
  const shy = sheetOpen && shyAtSheetOpen !== null ? shyAtSheetOpen : wantShy;

  /**
   * The state the last animation was run for. The two heights swap by `display`, so without
   * this the restore would animate again every time the delta strip or the breakpoint moved
   * the head while it was already open.
   */
  const animatedShyRef = useRef(shy);

  useLayoutEffect(() => {
    const el = headRef.current;
    const changed = animatedShyRef.current !== shy;
    animatedShyRef.current = shy;

    // Nothing to animate: the swap has already happened in this commit, so the only other
    // move is to hold the reserve right.
    if (el === null || !changed || prefersReducedMotion()) {
      sizeSpacer();
      return;
    }

    // Where the head is coming from, then where it is going. `from` is the recorded height
    // and NOT a reading taken here: a layout effect runs after its own commit, so by now the
    // head is already the height it is meant to arrive at, and measuring would give the same
    // number twice and animate nothing.
    const from = lastHeightRef.current;
    el.style.transition = "";
    el.style.height = "";
    el.style.overflow = "";
    const to = el.getBoundingClientRect().height;
    if (from === null || Math.abs(to - from) < 1) {
      sizeSpacer();
      return;
    }

    // An engine that will not run the transition must not be left waiting for one. jsdom
    // computes no styles and fires no `transitionend`, so the measurement gate below would
    // stay shut for the length of the safety timer and the thresholds would be read off
    // whatever was recorded before it — which is how this arrived: a unit test that passed
    // alone and failed in a suite, purely on how long the previous file took.
    el.style.transition = `height ${COLLAPSE_MS}ms ease`;
    const duration = Number.parseFloat(getComputedStyle(el).transitionDuration || "0");
    if (!Number.isFinite(duration) || duration <= 0) {
      el.style.transition = "";
      sizeSpacer();
      return;
    }

    animatingRef.current = true;
    // Clipped for the length of the transition only. The open head carries controls that
    // open above and below it, and a head that clipped at rest would cut them off.
    el.style.overflow = "hidden";
    el.style.transition = "none";
    el.style.height = `${from}px`;
    // Read back, so the browser has a start value to transition FROM. Without it both
    // heights land in one style recalculation and the head jumps, which is the defect.
    void el.getBoundingClientRect().height;
    el.style.transition = `height ${COLLAPSE_MS}ms ease`;
    el.style.height = `${to}px`;
    sizeSpacer();

    let frame = 0;
    const settle = () => {
      animatingRef.current = false;
      el.style.transition = "";
      el.style.height = "";
      el.style.overflow = "";
      // Now, and only now, the head is its own height again — so this is the first read
      // that may be recorded.
      sizeSpacer();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== el || event.propertyName !== "height") return;
      settle();
    };
    el.addEventListener("transitionend", onEnd);
    // `transitionend` does not fire for a transition that never starts — a tab hidden
    // mid-change is the ordinary way to get one — and a head left at a fixed height would
    // stay that height for the rest of the visit.
    const timer = setTimeout(settle, COLLAPSE_MS + 120);
    // The spacer is written from the head's CURRENT height, and the `ResizeObserver` above
    // is what usually delivers that. It reports the box, which a transitioned height does
    // move, but it is not promised on every frame — so the reserve is also driven here for
    // the length of the animation, which is what keeps the document from shifting under the
    // grid while the head grows.
    const tick = () => {
      if (!animatingRef.current) return;
      sizeSpacer();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      // Only while a transition is actually in flight, and read before it is torn down: the
      // height the head had REACHED is where the next one carries on from. Recording
      // unconditionally is what broke the restore — a cleanup runs after its own commit, so
      // the figure it read was the open head's full height, and the transition that followed
      // was asked to animate from 288 to 288.
      if (animatingRef.current) {
        const reached = el.getBoundingClientRect().height;
        settle();
        lastHeightRef.current = reached;
      }
    };
    // Keyed, not every render. Without a list this ran after every keystroke in the search
    // field and every modal update, each one forcing a synchronous `getBoundingClientRect`
    // for a head whose size had not moved. The `ResizeObserver` covers ordinary size
    // changes; this covers the transitions it cannot see.
  }, [shy, deltaFiring, isDesktop, sizeSpacer]);

  return { shy, headRef, spacerRef, openHead: () => setCollapsed(false) };
}
