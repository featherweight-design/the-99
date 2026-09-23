// The card mark's hover tooltip.
//
// AN ENHANCEMENT, NEVER THE GLOSS. It does not exist on a phone, so the key still carries
// the vocabulary and the modal still spells all three out. If this were the only
// explanation, this would be the retired deck-status design with a desktop-only escape
// hatch — a signal the owner cannot read is not a signal.
//
// POINTER-FINE ONLY, and that is a capability query rather than a width one: a touch
// device at 1400px has no hover, and a hover that needs a tap is a control the reader did
// not ask for. No tap target, no focus ring, no native `title` — the accessible name on
// the mark already says the fact, and a `title` would make a screen reader say it twice.
//
// ONE BOX PER MARK. A card carrying two facts shows two tooltips, one at a time, never a
// merged sentence — the facts are independent, and a merged line would imply they add up
// to something. They do not add up to anything until the deck-level verdict says so.

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useMinWidth } from "../ui/use-min-width";

import { type CardFact, cardMarkCopy } from "../../lib/copy/card-mark";

/** The handoff's figure: long enough not to fire on a pointer crossing the row. */
export const OPEN_DELAY_MS = 400;

/**
 * The room the bubble needs above its mark before it may open there: its 6px offset plus two
 * lines of 11.5px at 1.45 leading, 6px padding either side and its border — the longest
 * sentence wraps once at the 220px cap. Now the FALLBACK only: `placeBubble` judges the flip on
 * the bubble's measured height, and uses this before a first measurement exists.
 */
export const ROOM_ABOVE_PX = 54;

/** The bubble's widest, and the air it keeps from whatever edge would clip it. */
export const MAX_BUBBLE_PX = 220;
export const EDGE_PX = 4;

/**
 * The box that would clip a bubble drawn around `el`: the nearest ancestor that clips its
 * overflow, or the viewport when none does.
 *
 * WHY THE TOOLTIP HAS TO ASK. It is `position: absolute` inside its mark, so an ancestor with
 * `overflow` other than `visible` cuts off any part of it that leaves that ancestor's box —
 * and two hosts draw marks inside a scroller: the quick-add results (`max-h` + `overflow-y-auto`)
 * and the top-off list's desktop box. On the first row of either, the mark sits ~23px under the
 * scroller's top edge, and a bubble drawn above it is clipped in part or whole. The collection
 * grid's tiles are a third clipping box, and a narrow one: see `placeBubble`.
 */
export function clipBoxFor(el: Element): { top: number; left: number; right: number } {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowY !== "visible" || style.overflowX !== "visible") {
      const r = node.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right };
    }
  }
  return { top: 0, left: 0, right: window.innerWidth };
}

export type BubblePlace = {
  below: boolean;
  /** The bubble's left edge, in px from the MARK's left edge — it is absolute inside the mark. */
  left: number;
  maxWidth: number;
  /** What `left` came to, named, so a test can ask without doing the arithmetic. */
  align: "center" | "start" | "end";
};

/**
 * WHERE THE BUBBLE GOES, from MEASURED geometry: the mark, the bubble, and the box that would
 * clip it. Three rules, each paid for.
 *
 * - IT IS NEVER WIDER THAN ITS BOX. The collection grid's tiles are `overflow-hidden` and ~178px
 *   wide, and a 220px bubble in one was cut off whatever it was aligned to — 53px on the right,
 *   measured at 1300 and at 1024. So the cap is the box's width less the air either side.
 * - IT IS CENTRED ON ITS MARK, THEN CLAMPED INTO THE BOX. Centring alone crossed an edge the
 *   moment a mark LED its line, which the combo lemniscate does: on the quick-add results the
 *   bubble began 17px past the scroller and read `ompletes a two-card combo…`.
 * - IT OPENS BELOW WHEN IT DOES NOT FIT ABOVE, judged on its own measured height, so a sentence
 *   that wraps to three lines at a narrow cap flips as readily as a two-line one.
 *
 * A bubble with no measured size yet (jsdom lays nothing out) is taken at its widest and at
 * `ROOM_ABOVE_PX` tall, which is the size the flip and the clamp were first written against.
 */
export function placeBubble(
  mark: { top: number; left: number; width: number },
  bubble: { width: number; height: number },
  box: { top: number; left: number; right: number },
): BubblePlace {
  const maxWidth = Math.max(0, Math.min(MAX_BUBBLE_PX, box.right - box.left - 2 * EDGE_PX));
  const w = Math.min(bubble.width || maxWidth, maxWidth);
  const h = bubble.height || ROOM_ABOVE_PX - 6;
  const mid = mark.left + mark.width / 2;
  const wanted = mid - w / 2;
  const lo = box.left + EDGE_PX;
  const hi = box.right - EDGE_PX - w;
  const at = Math.min(Math.max(wanted, lo), hi);
  const align = at > wanted + 0.5 ? "start" : at < wanted - 0.5 ? "end" : "center";
  return { below: mark.top - box.top < h + 6, left: at - mark.left, maxWidth, align };
}

/**
 * `fact` names one of the bracket facts and looks its sentence up; `sentence` supplies one
 * directly, for a mark whose words depend on the CARD rather than on the fact.
 *
 * The combo mark is the second kind: its tooltip names a partner. Passing the sentence keeps
 * the chrome, the delays and the pointer-fine rule in ONE place — a second tooltip component
 * for one sentence is exactly the drift this file's own header refuses.
 */
export function FactTooltip({
  fact,
  sentence,
  children,
}: {
  fact?: CardFact;
  sentence?: string;
  children: React.ReactNode;
}) {
  // THE REPO'S ONE MEDIA-QUERY SUBSCRIBER, not a second copy. This was a state-plus-effect
  // whose mount effect called `setFine` synchronously, which React 19's
  // `react-hooks/set-state-in-effect` rejects — and the first fix for that wrote a private
  // `useSyncExternalStore` triple here, which is exactly the duplication `use-min-width.ts`'s
  // own header exists to refuse: "the drift each move was correcting is a second copy of the
  // subscriber, so there is one, taking the query as an argument."
  //
  // The name says min-width and the hook takes any query, which its header states. Renaming it
  // to `useMediaQuery` is a follow-up rather than a rider on a PR that exists to unblock a red
  // `main`; the one production caller is `use-is-desktop.ts`.
  //
  // Its server snapshot is `false`, which is the behaviour the effect had: a server render and
  // a touch device both draw the children bare. Subscribing also makes this REACTIVE, where
  // the mount-once read stayed false for the session however the device changed.
  const fine = useMinWidth("(pointer: fine)");

  // THE HOVER STATE LIVES IN THE CHILD, and that is the whole reason this component splits.
  //
  // Making the pointer reactive made a transition reachable that never was before: fine →
  // coarse → fine. With `open` and the timer held HERE, the coarse branch would merely stop
  // drawing the wrapper while both survived — so a tooltip open at the moment a mouse was
  // unplugged came back already open when it was plugged in again, with no `pointerenter`,
  // and a timer armed before the change could still fire into the coarse branch.
  //
  // Unmounting is the fix rather than a reset effect, because React discarding the child's
  // state cannot be forgotten the way a dependency list can.
  // NO TOOLTIP ON TOUCH, which is the shipped rule and the one the combo mark inherits: the
  // row's own tap opens the modal, where every partner and state is listed.
  if (!fine) return <>{children}</>;
  const text = sentence ?? (fact ? cardMarkCopy.tooltip[fact] : "");
  if (!text) return <>{children}</>;
  return <FinePointerTooltip text={text}>{children}</FinePointerTooltip>;
}

function FinePointerTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Decided when the bubble OPENS, from the laid-out geometry at that moment: the row may have
  // scrolled since it mounted, so a side chosen at mount would be a guess about a past scroll.
  // An estimate on open, then corrected from the bubble's MEASURED size before paint — the
  // second pass matters when the width cap narrows the bubble and its sentence wraps taller.
  const [place, setPlace] = useState<BubblePlace | null>(null);
  const anchor = useRef<HTMLSpanElement | null>(null);
  const bubble = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useLayoutEffect(() => {
    if (!open || !place) return;
    const a = anchor.current;
    const b = bubble.current;
    if (!a || !b) return;
    const br = b.getBoundingClientRect();
    const next = placeBubble(a.getBoundingClientRect(), br, clipBoxFor(a));
    // Only when something moved, or this would re-run on its own write forever.
    // `Object.is` for the numbers: a rect with a missing field yields NaN, and `NaN !== NaN`
    // would re-run this effect on every commit it causes.
    if (
      next.below !== place.below ||
      !(Math.abs(next.left - place.left) <= 0.5 || Object.is(next.left, place.left)) ||
      !Object.is(next.maxWidth, place.maxWidth)
    ) {
      setPlace(next);
    }
  }, [open, place]);

  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  return (
    <span
      // `shrink-0` on the WRAPPER, not only on the glyph inside it. Once the mark is
      // wrapped, this span is the flex item its row measures, and an `inline-flex` with
      // the default `flex-shrink: 1` squeezes in a crowded name cell while the `shrink-0`
      // svg inside it keeps its width and overflows.
      ref={anchor}
      className="relative inline-flex shrink-0"
      onPointerEnter={() => {
        cancel();
        timer.current = setTimeout(() => {
          const el = anchor.current;
          if (el) {
            setPlace(placeBubble(el.getBoundingClientRect(), { width: 0, height: 0 }, clipBoxFor(el)));
          }
          setOpen(true);
        }, OPEN_DELAY_MS);
      }}
      onPointerLeave={() => { cancel(); setOpen(false); }}
    >
      {children}
      {open && place && (
        <span
          ref={bubble}
          // aria-hidden: the mark it wraps already carries the fact as its accessible
          // name, and this sentence is the same fact in more words.
          aria-hidden
          data-side={place.below ? "below" : "above"}
          data-align={place.align}
          className={`pointer-events-none absolute ${place.below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"} z-50 w-max rounded-[7px] px-[9px] py-[6px] text-[11.5px] leading-[1.45]`}
          style={{
            left: place.left,
            maxWidth: place.maxWidth,
            background: "var(--elevated)",
            border: "1px solid var(--border)",
            color: "var(--fg-body)",
            boxShadow: "0 4px 14px color-mix(in srgb, var(--bg) 70%, transparent)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
