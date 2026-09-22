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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  return (
    <span
      // `shrink-0` on the WRAPPER, not only on the glyph inside it. Once the mark is
      // wrapped, this span is the flex item its row measures, and an `inline-flex` with
      // the default `flex-shrink: 1` squeezes in a crowded name cell while the `shrink-0`
      // svg inside it keeps its width and overflows.
      className="relative inline-flex shrink-0"
      onPointerEnter={() => { cancel(); timer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS); }}
      onPointerLeave={() => { cancel(); setOpen(false); }}
    >
      {children}
      {open && (
        <span
          // aria-hidden: the mark it wraps already carries the fact as its accessible
          // name, and this sentence is the same fact in more words.
          aria-hidden
          className="pointer-events-none absolute left-1/2 bottom-[calc(100%+6px)] z-50 w-max max-w-[220px] -translate-x-1/2 rounded-[7px] px-[9px] py-[6px] text-[11.5px] leading-[1.45]"
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
