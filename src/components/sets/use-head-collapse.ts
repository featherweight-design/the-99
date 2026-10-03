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

/** Whether focus arrived by keyboard (`:focus-visible`), which is the only focus that holds the head open (H17). */
function keyboardFocused(el: Element | null): boolean {
  if (el === null) return false;
  try {
    return el.matches(":focus-visible");
  } catch {
    // An engine without the selector: keep the old, safer rule and hold on any focus.
    return true;
  }
}

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
 * There is no hysteresis CONSTANT any more, and this note is why.
 *
 * The band is what stops a head one pixel either side of a single threshold flipping on
 * every frame of a slow scroll, and the two thresholds already provide one: the head
 * reopens where the reserve would start showing (`gridTop − bar`) and collapses where the
 * open head has entirely left (`gridTop`). That is a band of exactly the bar's own height —
 * ~57 at `md`, ~75 on the phone — and it needs no constant on top.
 *
 * A constant on top is what made the addendum's 120 visible as a fault. Once a bar has been
 * measured, `reopenAt + 120` put the collapse 63px BELOW where the open head leaves, so on
 * every collapse after the first of a visit there was a band with no head on screen at all
 * and then the bar snapped in. On the phone the same arithmetic reads 80 − ~75 = ~5px,
 * which is why it was never seen there. The pinned desktop head hid it too, until the head
 * stopped being pinned while open.
 *
 * The wheel case the 120 was retuned for still holds without it: a notch is ~100–120px, so
 * one notch crosses both thresholds and lands the reader in a state they scrolled to. That
 * is a gesture answered, not flutter — flutter is a head changing state while the reader is
 * still, which two thresholds a bar's height apart cannot produce.
 */

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
 * @param isDesktop  Both widths collapse since addendum 2; this decides the band and is the
 *   one event that invalidates every measurement held here — see the reopen below.
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
   * A breakpoint crossing reopens the head — and it still does, now that BOTH widths
   * collapse. Addendum 2 §3 says the reopen goes with the `!isDesktop` term; it cannot.
   *
   * The two widths have two rest heights — ~288 and ~300 on the set `probe:sets` measures,
   * and a different pair on the next set — and this hook holds one `restHeightRef`. While
   * the head is shy its open subtree is `display: none`, so a reader who collapses on the
   * phone and widens can neither trust the recorded figure nor re-measure to replace it: the
   * spacer would reserve the wrong width's height less the bar in front of it, and `gridTop`
   * is read off that spacer, so both thresholds go with it. Reopening is the one action that
   * makes the head measurable again at its new width.
   *
   * Clearing the recorded height instead was tried and measured worse: the reserve goes to
   * 0 where the desktop figure was accidentally within 3px of right.
   *
   * NOTHING PROVES THIS TODAY, which is worth knowing before anyone deletes it. Removing the
   * reopen leaves every unit test and every probe check green: the probe's round trip ends
   * back at the phone, where a head that never re-measured still holds the right figures,
   * and on the sets available here the two rest heights are ~302 and ~300 — closer than any
   * assertion can separate. The argument above is the reason it stays; a fixture whose title
   * wraps at one width and not the other would turn it into a measurement.
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
  //
  // `!isDesktop` is gone: addendum 2 reverses the ruling that kept the desktop head at one
  // height.
  //
  // There is NO rarity-panel term, though addendum 2 §3 asks for one. The panel it names
  // dismisses itself on scroll already (`filter-panel.tsx`, the desktop popover's own
  // `scroll` listener), so there is no state in which a collapse can land under an open
  // panel — the gate was built, measured by `probe:sets` and found to be unreachable: the
  // probe opened the panel, scrolled, and the head collapsed because the panel had closed
  // itself first. A gate nothing reaches is worse than none, because the next reader takes
  // it for a rule that holds.
  const mayCollapse = !deltaFiring;

  const headRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const restHeightRef = useRef<number | null>(null);
  /** The collapsed bar's height, measured the same way and only while it is drawn. */
  const barHeightRef = useRef<number | null>(null);
  /**
   * Armed for the step that SETTLES a crossing, so that step does not animate either — and
   * taken down again whether or not there is one, so nothing later is suppressed.
   *
   * Now that both widths collapse, a crossing made while shy reopens the head (the reserve
   * is the other width's and nothing can be measured until it is open) and the scroll
   * listener — re-armed by the same `isDesktop` change — immediately re-decides at the
   * reader's offset, usually back to collapsed. That second decision lands in its own
   * commit, where `crossedBreakpoint` is already false: without this it animates, and the
   * reader watches the head pop open and slide shut for a window resize.
   *
   * Armed by the passive effect at the exact moment it re-evaluates for the new width, and
   * consumed by whichever layout run that evaluation causes. Its backstop is the reader's
   * NEXT scroll rather than a frame, so no timing assumption is made anywhere.
   *
   * Two wrong versions came before this one, and both are worth keeping in view. The first
   * cleared it on the next RUN of this layout effect: that effect runs only when `shy`,
   * `isDesktop` or `deltaFiring` changes, so a crossing at the top of the page settled
   * nothing and the flag sat set until the reader's next genuine collapse, minutes later,
   * which then snapped. The second cleared it on a `requestAnimationFrame`, and `probe:sets`
   * caught that one in a real engine: the frame fires before React flushes the re-render the
   * settle's `setCollapsed` schedules, so the flag was already down when the layout run
   * arrived and the head animated 299.5px → 57px across a window resize. jsdom orders those
   * two the way that happens to work, so no unit test here can tell the versions apart —
   * the check that can is in the probe.
   *
   * What is left makes no timing assumption at all: armed where the settle is dispatched,
   * consumed by the layout run it causes, and taken down by the next scroll event if it
   * causes none.
   */
  const settlingCrossingRef = useRef(false);
  /**
   * Set at a crossing, read once by the passive effect's re-evaluation below. Two flags
   * because they answer different questions — "a crossing happened" and "the evaluation now
   * running is that crossing's".
   */
  const crossingPendingRef = useRef(false);
  /** True while an arm is outstanding, so the next real scroll can take it down. */
  const staleArmRef = useRef(false);

  /** The width the recorded bar belongs to, so a trip can tell whose figure it holds. */
  const barDesktopRef = useRef<boolean | null>(null);
  /**
   * True only between the start of a height transition and its end. Every measurement is
   * off limits while it is: mid-animation the head is whatever pixel the transition has
   * reached, and recording that as the rest height leaves the spacer reserving a head that
   * existed for one frame.
   */
  const animatingRef = useRef(false);
  /**
   * The pair in flight, so a reversal cancels rather than races.
   *
   * Declared up here with the other refs rather than beside the effect that writes it: the
   * `ResizeObserver` below reads it, and a ref an effect reads may not be written by
   * anything declared later (`react-hooks/immutability`).
   */
  const runningRef = useRef<Animation[]>([]);
  /**
   * Set when a step ends because something interrupted it rather than because it finished.
   * The next run reads it to know it has a reader mid-step to carry on from.
   */
  const interruptedRef = useRef(false);
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
    const measure = () => {
      // A step in flight sizes the reserve itself, through the keyframes the layout effect
      // wrote — so the observer stands down rather than writing a figure of its own, and the
      // effect below picks the step up again if the head's natural height moved underneath
      // it.
      if (animatingRef.current) return;
      sizeSpacer();
    };
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
  const evaluateCollapse = useCallback((onDesktop: boolean) => {
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
    if (head !== null && !animatingRef.current) {
      if (head.hasAttribute("data-set-head-collapsed")) {
        barHeightRef.current = head.getBoundingClientRect().height;
        barDesktopRef.current = onDesktop;
      } else if (barDesktopRef.current !== null && barDesktopRef.current !== onDesktop) {
        // A bar measured at one width must not decide a threshold at the other. Both widths
        // draw one now, and what is recorded here is the HEAD's box rather than the bar
        // inside it — ~75 on the phone (a 52px bar plus the head's own 10/12 padding) against
        // ~57 at `md`, where the head IS the row. So the rule is no longer "clear the phone's
        // figure once we are on desktop" but "clear whichever figure was not measured here".
        // Cleared rather than kept, so the first collapse after a trip runs on the grid's
        // own top like any other first collapse.
        barHeightRef.current = null;
        barDesktopRef.current = null;
      }
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
    // The open head has entirely left. The same expression whether or not a bar has been
    // measured, which is the other half of what was wrong here: the first collapse of a
    // visit ran on `gridTop` and every later one on `reopenAt + band`, so one visit had two
    // different collapse points.
    const collapseAt = measured ? gridTop : 120;
    // Focus inside a member the collapse HIDES holds the head open, because hiding it takes
    // the keyboard with it — the cost strip's Send, its disclosure, a chip's ×. Read at
    // decision time rather than through a `focusin`/`focusout` pair: every other input to
    // this decision is already re-read here, and the twelve review rounds this file cost
    // were all lifecycle defects.
    //
    // Only ever a reason NOT to collapse. A reader who is already looking at the bar and
    // tabs into the row must not have the head open itself underneath them, which is why
    // this gates the open→shy edge alone and never the restore.
    //
    // KEYBOARD focus only (H17, Hugh's walk 2026-10-02). The cost strip's toggles take
    // focus on every press so a keyboard reader lands on the control that replaced the one
    // they pressed, and a TAP does the same. Held on any focus, a tap on the strip's
    // disclosure left focus inside a hidden member, so the head never collapsed and so
    // never pinned, until the reader happened to focus something else. A pointer press
    // leaves no keyboard to take away, and `:focus-visible` is the browser's own answer to
    // which kind of focus this is.
    const holdsFocus = head !== null
      && keyboardFocused(document.activeElement)
      && [...head.querySelectorAll("[data-set-shy-hides]")]
        .some((member) => member.contains(document.activeElement));
    // Read as a function of the CURRENT state, which is what makes this hysteresis rather
    // than two thresholds: collapsed stays collapsed until the reserve would show, open
    // stays open until a band past it, and between the two nothing happens. Never
    // interpolated with the scroll offset — a head that tracked it would be permanently in
    // motion under the thing being read.
    setCollapsed((was) => (was ? y > reopenAt : !holdsFocus && y > collapseAt));
  }, []);

  // Placed after the recorder above, not before it: the decision is read off the
  // measurements `sizeSpacer` writes, and a ref an effect reads may not be written by
  // anything declared later (`react-hooks/immutability`).
  useEffect(() => {
    if (!mayCollapse) return;
    // An open sheet freezes the head: the listener stands down and `collapsed` holds.
    if (sheetOpen) return;
    // The READER's scrolls, which are never a settle. A stale arm — a crossing whose
    // evaluation changed nothing, so no layout run came to consume it — is taken down here
    // before anything is decided, so it can never suppress this scroll's own step.
    const onScroll = () => {
      if (staleArmRef.current) {
        staleArmRef.current = false;
        settlingCrossingRef.current = false;
      }
      evaluateCollapse(isDesktop);
    };
    // A crossing's settle is THIS call: the layout effect above has already reopened the
    // head, and re-arming for the new width re-decides at the reader's offset. Arming the
    // suppression immediately around it is what makes the ordering irrelevant — whatever
    // state change this causes, the layout run that follows sees the flag.
    //
    // An evaluation that changes nothing brings no layout run to consume the flag, so the
    // listener below takes it down on the reader's next scroll instead — before deciding
    // anything, so a stale arm can never suppress that scroll's own collapse.
    if (crossingPendingRef.current) {
      crossingPendingRef.current = false;
      settlingCrossingRef.current = true;
      staleArmRef.current = true;
    }
    // The initial read is deliberately NOT `onScroll`: this call IS the settle when a
    // crossing is pending, and routing it through the reader's handler would disarm the
    // suppression in the very call it was armed for.
    evaluateCollapse(isDesktop);
    // The first read is above, in a passive effect, so a reload at scrollY > 120 paints the
    // open head for one frame before collapsing. Moving it to a layout effect is what the
    // shape asks for and `react-hooks/set-state-in-effect` forbids outright; deriving it
    // during render would read `window.scrollY` on the server and mismatch on hydration.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mayCollapse, sheetOpen, isDesktop, evaluateCollapse]);

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

  /** The breakpoint the last run saw. A crossing is a re-layout, never a transition. */
  const animatedDesktopRef = useRef(isDesktop);


  /**
   * The RESTORE, animated (the collapse snaps since H14: by the time it fires the open head
   * has scrolled away, so animating it pinned a full-height head over the grid) — and owned by the engine rather than by this
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
    // handler below, which records where the head had reached and re-reads the reserve.
    //
    // `interruptedRef` is how that fact survives into this run. React tears the previous
    // effect down BEFORE setting the new one up, so by the time this line is reached the
    // list has already been emptied by that cleanup — reading its length here always said
    // "nothing was running", and the restart this enables never happened once.
    const wasRunning = interruptedRef.current || runningRef.current.length > 0;
    interruptedRef.current = false;
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
    // A run already in flight is reason enough to step, even where `shy` has not moved: the
    // delta strip arriving or clearing changes the head's natural height, and the keyframes
    // in flight are aiming at the height it had a moment ago. Cancelling above and
    // re-deriving here restarts the step from the pixel the reader can see to the height the
    // head now wants, which is what keying this effect on `deltaFiring` could not do while
    // the step was a CSS transition — the setup that followed the teardown saw no change and
    // never restarted.
    const stepping = changed || wasRunning;
    // Consumed, not merely read: one settle, one suppression.
    const settling = settlingCrossingRef.current;
    settlingCrossingRef.current = false;
    if (crossedBreakpoint) crossingPendingRef.current = true;
    // The COLLAPSE is never animated, only the restore (H14, Hugh's walk 2026-10-02: "the
    // collapse jumps to full height first"). The head turns `sticky` in the same commit that
    // draws the bar, so a step from the open height pinned a full-height head over the top
    // of the grid and shrank it there: measured at 390x844, `top 0, height 302, sticky` on
    // the first frame of the collapse, then 81, 79 … 75. And there is nothing to animate on
    // that edge: the decision waits until the open head has scrolled entirely past
    // (`collapseAt` is the grid's top), so the reader never saw the open form shrink — only
    // a form that was off-screen reappearing at full height. The restore keeps its step,
    // since that head is in the flow and grows into a band the reader is looking at.
    const collapsing = shy;
    if (el === null || spacer === null || !stepping || collapsing || crossedBreakpoint || settling
      || prefersReducedMotion() || typeof el.animate !== "function"
      || from === null || to === null || Math.abs(to - from) < 1) {
      // A bar height measured at one width must not decide a threshold at the other. The
      // crossing clears it here as well as in `evaluateCollapse`, because the listener's
      // next read may be a whole gesture away and the first decision after a crossing is
      // the one most likely to be wrong.
      if (crossedBreakpoint) {
        barHeightRef.current = null;
        barDesktopRef.current = null;
      }
      // Switched off BEFORE `sizeSpacer`, never after. Its reads force a layout with the bar
      // already drawn and the reserve not yet grown, and with anchoring live in that layout
      // Chrome moved the reader by the reserve's height: measured at 390x844, a collapse at
      // y=416 landed at y=642, the grid 226px up the screen, on every snapped collapse
      // (reduced motion's included, which took this branch before H14 too). jsdom does no
      // anchoring, so only a browser can see this one.
      if (containerRef.current !== null) containerRef.current.style.overflowAnchor = "none";
      sizeSpacer();
      if (containerRef.current !== null) {
        // The anchoring switch still applies: the leap is the height change's doing, not the
        // animation's, so even an instant swap needs it off for the frame it lands in.
        //
        // The release is guarded, not unconditional. The first layout pass takes this path,
        // and the passive scroll read can start a real step before its frame arrives — an
        // unguarded release then turns anchoring back on in the middle of the transition and
        // hands back the leap this switch exists to remove.
        const container = containerRef.current;
        container.style.overflowAnchor = "none";
        requestAnimationFrame(() => {
          if (!animatingRef.current) container.style.overflowAnchor = "";
        });
      }
      return;
    }

    const container = containerRef.current;
    if (container !== null) container.style.overflowAnchor = "none";

    // The head it is ARRIVING at, measured now. While the head is collapsed its open subtree
    // is `display: none` and cannot be measured, so a filter changed through the sheet
    // leaves the recorded rest height describing a head that no longer exists — and the two
    // keyframe pairs below would then not sum to a constant, which is the whole point of
    // animating them together.
    if (!el.hasAttribute("data-set-head-collapsed")) {
      const delta = el.querySelector("[data-set-delta]");
      restHeightRef.current = to - (delta === null ? 0 : delta.getBoundingClientRect().height);
    }
    const rest = restHeightRef.current;
    // The START of the reserve is what the document is holding right now, not what the new
    // rest height implies: `head + spacer` has to be continuous across the first frame as
    // well as the last.
    const spacerFrom = Math.max(0, spacer.getBoundingClientRect().height);
    const spacerTo = rest === null ? spacerFrom : Math.max(0, rest - to);

    // Clipped for the length of the step only. The open head carries controls that open
    // above and below it, and a head that clipped at rest would cut them off.
    el.style.overflow = "hidden";
    // Both boxes pinned at where the step ENDS, in this commit.
    //
    // The END rather than the start, and that is the whole subtlety. `Element.animate`
    // defaults to `fill: "none"`, so the keyframes stop contributing the moment the step
    // finishes and the box falls back to whatever the inline height says: pinned to the
    // start, a completed step lands back where it began for the frame before the handler
    // clears it. Pinned to the target, the fallback IS the target, the keyframe at time 0
    // still paints the start, and nothing jumps at either end.
    el.style.height = `${to}px`;
    spacer.style.height = `${spacerTo}px`;
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

    const done = (interrupted: boolean) => {
      // `cancel()` and `finish` both arrive here, and the guard is what makes the pair
      // safe: cancelling the head fires this, which cancels the spacer, which fires it
      // again.
      if (!animatingRef.current) return;
      animatingRef.current = false;
      // BOTH heights as the reader currently sees them, read before anything is torn down.
      // A reversal has to carry on from here, and both halves matter: the head alone leaves
      // the reserve starting at its steady-state figure, so `head + spacer` is discontinuous
      // on the first frame of the new step and the document jumps by the difference.
      const reachedHead = el.getBoundingClientRect().height;
      const reachedSpacer = spacer.getBoundingClientRect().height;
      for (const running of runningRef.current) running.cancel();
      runningRef.current = [];
      el.style.overflow = "";
      el.style.height = "";
      if (container !== null) container.style.overflowAnchor = "";
      // Now that the head is its own height again, the steady-state figures may be re-read —
      // the rest height, and the bar's, which is what the threshold wants. A reader who
      // scrolled up while this ran was answered on the fallback and may have come to rest
      // inside the band; nothing else would revisit that until they scrolled again.
      sizeSpacer();
      // And then the in-flight pair goes back on top of what `sizeSpacer` just recorded. It
      // measures the form the head has ARRIVED at — which after a cancel is the new target,
      // not the pixel the reader is looking at — so leaving its figures in place makes the
      // next step either a snap (`from === to`) or a jump (a reserve starting where nothing
      // is drawn). On a clean finish the two are the same figures, so this costs nothing
      // there.
      lastHeightRef.current = reachedHead;
      spacer.style.height = `${reachedSpacer}px`;
      interruptedRef.current = interrupted;
      evaluateCollapse(isDesktop);
    };
    const onFinish = () => done(false);
    const onCancel = () => done(true);
    headAnim.addEventListener("finish", onFinish);
    headAnim.addEventListener("cancel", onCancel);

    return () => {
      headAnim.removeEventListener("finish", onFinish);
      headAnim.removeEventListener("cancel", onCancel);
      // A teardown is an interruption by definition: either the reader reversed, or
      // something moved the head's size under a step that was still running.
      done(true);
    };
    // `deltaFiring` is a dependency again, and safe to be one now: a change while a step is
    // running re-derives and restarts it rather than tearing it down with nothing to pick it
    // up, which is what the CSS transition could not do.
  }, [shy, isDesktop, deltaFiring, sizeSpacer, evaluateCollapse]);

  return { shy, headRef, spacerRef, containerRef, openHead: () => setCollapsed(false) };
}
