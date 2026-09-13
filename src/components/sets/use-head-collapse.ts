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
   * Goes on the element that holds the head, the spacer and the grid. Scroll anchoring is
   * suspended on it for the length of a collapse and restored afterwards — see the switch in
   * the layout effect below for why it is neither left on nor left off.
   */
  containerRef: React.RefObject<HTMLDivElement | null>;
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
  const containerRef = useRef<HTMLDivElement>(null);
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

  /**
   * The collapse decision, as a function of the current scroll offset.
   *
   * A callback rather than a body inside the listener, because the listener is not the only
   * thing that has to be able to ask. A transition settling is the other: the bar's height
   * cannot be measured while one is running, so a reader who scrolls up DURING the first
   * collapse gets the fallback threshold, and without a re-ask afterwards a thumb that comes
   * to rest at, say, y=100 leaves the head collapsed over an empty strip until the next
   * scroll event — which may never come.
   */
  const evaluateCollapse = useCallback(() => {
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
    // The head's own height is the signal that anything here was laid out at all. A
    // `gridTop` on its own cannot say: an engine that lays nothing out reports every rect at
    // 0, and `0 + scrollY` then reads as a plausible grid top that is really just the
    // reader's offset.
    const laidOut = head !== null && head.getBoundingClientRect().height > 0;
    const measured = laidOut && gridTop !== null && gridTop > 0;
    const reopenAt = !measured || bar === null || bar <= 0 ? 40 : Math.max(0, gridTop - bar);
    // The FIRST collapse of a visit has no bar to measure — one has never been drawn — and
    // running it on the old fixed 120 made it the only collapse of the visit at that offset,
    // with every later one at ~405. The grid's own top answers it without a bar: collapse
    // when the open head has scrolled entirely past, which is within a few pixels of where
    // the measured rule puts it once a bar exists. Only an engine that lays nothing out
    // still falls back to 120.
    const collapseAt = bar === null || bar <= 0
      ? (measured ? gridTop : 120)
      : reopenAt + HYSTERESIS_PX;
    // Read as a function of the CURRENT state, which is what makes this hysteresis rather
    // than two thresholds: collapsed stays collapsed until the reserve would show, open
    // stays open until a band past it, and between the two nothing happens. Never
    // interpolated with the scroll offset — a head that tracked it would be permanently in
    // motion under the thing being read.
    setCollapsed((was) => (was ? y > reopenAt : y > collapseAt));
  }, []);

  // Placed after the recorder above, not before it: the decision is read off the
  // measurements `sizeSpacer` writes, and a ref an effect reads may not be written by
  // anything declared later (`react-hooks/immutability`).
  useEffect(() => {
    if (!mayCollapse) return;
    // An open sheet freezes the head: the listener stands down and `collapsed` holds.
    if (sheetOpen) return;
    const onScroll = () => evaluateCollapse();
    // The first read is here, in a passive effect, so a reload at scrollY > 120 paints the
    // open head for one frame before collapsing. Moving it to a layout effect is what the
    // shape asks for and `react-hooks/set-state-in-effect` forbids outright; deriving it
    // during render would read `window.scrollY` on the server and mismatch on hydration.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mayCollapse, sheetOpen, evaluateCollapse]);

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

  /** The pair in flight, so a reversal cancels rather than races. */
  const runningRef = useRef<Animation[]>([]);
  /** The breakpoint the last run saw. A crossing is a re-layout, never a transition. */
  const animatedDesktopRef = useRef(isDesktop);

  /**
   * The step between the two heights, animated — and owned by the engine rather than by this
   * file.
   *
   * This was a CSS transition driven by hand: a `transitionend` listener, a safety timer for
   * the transition that never starts, an idempotent settle to keep the two from tripping
   * over each other, and a `requestAnimationFrame` loop to keep the reserve in step. Every
   * round of review landed in that lifecycle rather than in the effect it produces — a stale
   * timer landing inside the next transition, a dependency change settling a run nothing
   * restarted, a breakpoint crossing animated as though it were a restore. `Element.animate`
   * has the lifecycle already: a returned `Animation` cancels, replaces and reports itself,
   * so reversal is `cancel()` and cleanup is one handler that cannot run twice.
   *
   * The spacer is animated in the SAME call rather than written frame by frame, with the
   * mirror-image keyframes. Two animations of the same duration and easing move as one, so
   * the document's height is constant across the step by construction instead of by a loop
   * racing the paint.
   */
  useLayoutEffect(() => {
    const el = headRef.current;
    const spacer = spacerRef.current;
    const changed = animatedShyRef.current !== shy;
    const crossedBreakpoint = animatedDesktopRef.current !== isDesktop;
    animatedShyRef.current = shy;
    animatedDesktopRef.current = isDesktop;

    // Whatever was running is over the moment the target moves. `cancel()` fires the
    // handler below, which restores the head and re-reads the reserve.
    for (const running of runningRef.current) running.cancel();
    runningRef.current = [];

    const from = lastHeightRef.current;
    const to = el === null ? null : el.getBoundingClientRect().height;

    // Every reason not to animate, and they all end the same way: hold the reserve right.
    //
    // A BREAKPOINT crossing is in here deliberately. Widening while the phone bar is drawn
    // changes `shy` as a side effect of the re-layout, and animating that clipped the
    // desktop head's controls inside a 75px box on its way to a height that belongs to a
    // different design.
    if (el === null || spacer === null || !changed || crossedBreakpoint
      || prefersReducedMotion() || typeof el.animate !== "function"
      || from === null || to === null || Math.abs(to - from) < 1) {
      sizeSpacer();
      if (containerRef.current !== null) {
        // The anchoring switch still applies: the leap is the height change's doing, not the
        // animation's, so even an instant swap needs it off for the frame it lands in.
        const container = containerRef.current;
        container.style.overflowAnchor = "none";
        requestAnimationFrame(() => { container.style.overflowAnchor = ""; });
      }
      return;
    }

    const container = containerRef.current;
    if (container !== null) container.style.overflowAnchor = "none";

    const rest = restHeightRef.current;
    const spacerFrom = rest === null ? 0 : Math.max(0, rest - from);
    const spacerTo = rest === null ? 0 : Math.max(0, rest - to);

    // Clipped for the length of the step only. The open head carries controls that open
    // above and below it, and a head that clipped at rest would cut them off.
    el.style.overflow = "hidden";
    animatingRef.current = true;

    const timing = { duration: COLLAPSE_MS, easing: "ease" } as const;
    const headAnim = el.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      timing,
    );
    const spacerAnim = spacer.animate(
      [{ height: `${spacerFrom}px` }, { height: `${spacerTo}px` }],
      timing,
    );
    runningRef.current = [headAnim, spacerAnim];

    const done = () => {
      // `cancel()` and `finish` both arrive here, and the guard is what makes the pair
      // safe: cancelling the head fires this, which cancels the spacer, which fires it
      // again.
      if (!animatingRef.current) return;
      animatingRef.current = false;
      // Where the head had reached, before anything is torn down: a reversal carries on
      // from the pixel the reader can see rather than from the height it was aiming at.
      lastHeightRef.current = el.getBoundingClientRect().height;
      for (const running of runningRef.current) running.cancel();
      runningRef.current = [];
      el.style.overflow = "";
      if (container !== null) container.style.overflowAnchor = "";
      // Now that the head is its own height again, the reserve may be re-read — and the
      // bar's height with it, which is what the threshold below wants. A reader who
      // scrolled up while this ran was answered on the fallback and may have come to rest
      // inside the band; nothing else would revisit that until they scrolled again.
      sizeSpacer();
      evaluateCollapse();
    };
    headAnim.addEventListener("finish", done);
    headAnim.addEventListener("cancel", done);

    return () => {
      headAnim.removeEventListener("finish", done);
      headAnim.removeEventListener("cancel", done);
      done();
    };
    // Keyed on the state the step is BETWEEN, and on nothing else. It used to list
    // `deltaFiring` and `isDesktop` as well, so a delta arriving mid-step tore the step down
    // through the cleanup and the setup that followed saw no change to restart — the
    // smoothing snapped on an ordinary update. Those two move the head's SIZE, which the
    // `ResizeObserver` already answers.
  }, [shy, isDesktop, sizeSpacer, evaluateCollapse]);

  return { shy, headRef, spacerRef, containerRef, openHead: () => setCollapsed(false) };
}
