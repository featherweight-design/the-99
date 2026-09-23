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

import { useEffect, useRef, useState } from "react";

import { useMinWidth } from "../ui/use-min-width";

import { type CardFact, cardMarkCopy } from "../../lib/copy/card-mark";

/** The handoff's figure: long enough not to fire on a pointer crossing the row. */
export const OPEN_DELAY_MS = 400;

/**
 * The room the bubble needs above its mark before it may open there: its 6px offset plus two
 * lines of 11.5px at 1.45 leading, 6px padding either side and its border — the longest
 * sentence wraps once at the 220px cap. A bubble that cannot fit opens BELOW instead.
 */
export const ROOM_ABOVE_PX = 54;

/**
 * Half the bubble at its 220px cap, plus 4px of air. A mark nearer than this to the left or
 * right edge of whatever clips it cannot be the bubble's CENTRE without the bubble crossing that
 * edge, so the bubble is aligned TO the edge instead. Every mark sat right of a card name until
 * the combo clause's lemniscate, which LEADS its line: on the quick-add results the centred
 * bubble started 17px past the scroller's left edge and read `ompletes a two-card combo…`.
 */
export const HALF_BUBBLE_PX = 114;

/**
 * The top edge of whatever would clip a box drawn above `el`: the nearest ancestor that
 * clips its overflow, or the viewport's top when none does.
 *
 * WHY THE TOOLTIP HAS TO ASK. It is `position: absolute` inside its mark, so an ancestor with
 * `overflow` other than `visible` cuts off any part of it that leaves that ancestor's box —
 * and two hosts draw marks inside a scroller: the quick-add results (`max-h` + `overflow-y-auto`)
 * and the top-off list's desktop box. On the first row of either, the mark sits ~23px under the
 * scroller's top edge, and a bubble drawn above it is clipped in part or whole.
 */
export function clipTopFor(el: Element): number {
  return clipBoxFor(el).top;
}

/** The box that would clip a bubble drawn around `el`: the nearest clipping ancestor's edges,
 *  or the viewport's when none clips. The same walk `clipTopFor` always did, on all sides. */
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

/** Where the bubble sits across its mark. `center` unless an edge is too near for it. */
export function alignFor(el: Element): "center" | "start" | "end" {
  const r = el.getBoundingClientRect();
  const box = clipBoxFor(el);
  const mid = r.left + r.width / 2;
  if (mid - box.left < HALF_BUBBLE_PX) return "start";
  if (box.right - mid < HALF_BUBBLE_PX) return "end";
  return "center";
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
  const [below, setBelow] = useState(false);
  const [align, setAlign] = useState<"center" | "start" | "end">("center");
  const anchor = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

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
          setBelow(el ? el.getBoundingClientRect().top - clipTopFor(el) < ROOM_ABOVE_PX : false);
          setAlign(el ? alignFor(el) : "center");
          setOpen(true);
        }, OPEN_DELAY_MS);
      }}
      onPointerLeave={() => { cancel(); setOpen(false); }}
    >
      {children}
      {open && (
        <span
          // aria-hidden: the mark it wraps already carries the fact as its accessible
          // name, and this sentence is the same fact in more words.
          aria-hidden
          data-side={below ? "below" : "above"}
          data-align={align}
          className={`pointer-events-none absolute ${align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2"} ${below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"} z-50 w-max max-w-[220px] rounded-[7px] px-[9px] py-[6px] text-[11.5px] leading-[1.45]`}
          style={{
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
