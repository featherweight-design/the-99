"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { cardMarkCopy, type CardFact } from "../../lib/copy/card-mark";
import { TOUCH_HIT_INLINE } from "../ui/touch-hit";
import { CardFactMark } from "./card-fact-mark";
import { ComboGlyph } from "./combo-glyph";
import { FactTooltip } from "./fact-tooltip";

/**
 * A row's bracket marks with their fold: the deck row's (card rows addendum L1 to L4) and the Upgrade result's swap sides
 * (A3 call 7), one implementation so the two cannot drift.
 *
 * The marks fold by the ROW's own width (the card rows addendum, L3), a container query on an `@container` ancestor the host
 * supplies, rather than a viewport width: a two-column grid at 900px and a one-column page at 1300px give a row the same width.
 * Wide is 480px and up (the boards' `max-width: 479px` is inclusive, Tailwind's `@max-[480px]` is not), middle 360 to 479, tight
 * under 360. Folded marks go `sr-only`, never `display: none`, so a screen reader keeps hearing them; the `+N` spans are
 * aria-hidden, one per tier, each drawn only in its own. At every width: a phone row is a tight one. Every class spelled whole so
 * Tailwind sees it.
 */
const FOLD = {
  // All: the 5th mark and beyond at every width, every mark after the second at the middle tier, every mark after the first in
  // the tight one, unless a tier would fold exactly one mark, when it folds none (`foldsFrom`). One more than Shopping's rhythm at each tier: an All row draws a bare `$` where it drew a price (Hugh,
  // 2026-10-16), and the room that frees goes to the marks.
  all: {
    fifth: "sr-only",
    afterSecond: "@max-[480px]:sr-only",
    afterFirst: "@max-[360px]:sr-only",
    plusWide: "hidden @min-[480px]:inline",
    plusMid: "hidden @min-[360px]:@max-[480px]:inline",
    plusTight: "hidden @max-[360px]:inline",
  },
  // Shopping: every mark at the middle tier, and the `+N` stands in for them there AND in the tight one (d9, 2026-10-16: a
  // phone Shopping row is a tight one, and dropping the `+N` there left its marks no way onto the screen).
  shopping: {
    all: "@max-[480px]:sr-only",
    plus: "hidden @max-[480px]:inline",
  },
} as const;
/** The index each tier starts folding at: All keeps four marks wide, two in the middle and one tight; Shopping keeps none narrow. */
const FOLD_FROM = { all: { wide: 4, mid: 2, tight: 1 }, shopping: 0 } as const;

/**
 * Where a tier really starts folding, given how many marks the row has: a tier that would fold exactly ONE mark folds none, so
 * the reader sees that mark rather than a `+1` standing in for it (Hugh, 2026-10-27). A `+N` therefore always counts two or more.
 */
export function foldsFrom(count: number, from: number): number {
  return count - from === 1 ? count : from;
}

/**
 * One mark: a bracket fact, or the combo mark. A combo carries the glyph its host draws unfolded (the deck row's `ComboMark`, the
 * swap side's own hover) and the sentence the `+N` bubble lists when it folds.
 */
export type FoldMark = { kind: "fact"; fact: CardFact } | { kind: "combo"; sentence: string; glyph: ReactNode };

/** The `+N`'s pointer handlers: the deck row holds its card preview off while the pointer is on the chip (d9, 2026-10-16). */
export type PlusPointer = {
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseMove?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
};

/**
 * The marks, then a `+N` per tier, as sibling flex items of the host's name block (a fragment: the host's gap spaces them).
 * `shopping` folds by Shopping's rhythm; every other host by All's.
 */
export function FoldedMarks({ marks, shopping = false, plusPointer }: { marks: readonly FoldMark[]; shopping?: boolean; plusPointer?: PlusPointer }) {
  const from = (tier: number) => foldsFrom(marks.length, tier);
  const markFold = (i: number): string =>
    shopping
      ? i >= from(FOLD_FROM.shopping) ? FOLD.shopping.all : ""
      : i >= from(FOLD_FROM.all.wide)
        ? FOLD.all.fifth
        : i >= from(FOLD_FROM.all.mid)
          ? FOLD.all.afterSecond
          : i >= from(FOLD_FROM.all.tight)
            ? FOLD.all.afterFirst
            : "";
  const plusN = (fromIndex: number, className: string) => {
    const folded = marks.slice(fromIndex);
    if (folded.length === 0) return null;
    return (
      // The tier's visibility sits on the OUTER span, outside the tooltip's own wrapper (a fine pointer adds an inline-flex
      // item around its child): an inactive tier is then no flex item at all, and takes none of the name block's gap.
      <span key={className} className={`${className} flex-none font-mono text-[11px] leading-none`} data-fold="" {...plusPointer}>
        {/* On touch a tap opens the bubble (`tapOnTouch`), the one way the folded marks reach a phone screen, and the tap
            stops there rather than opening card details. Its 44px-tall hit is drawn past the figure (`TOUCH_HIT_INLINE`), never over its neighbours. */}
        <FactTooltip
          tapOnTouch
          lines={folded.map((m) =>
            m.kind === "fact" ? (
              <>
                <CardFactMark fact={m.fact} />
                {cardMarkCopy[m.fact]}
              </>
            ) : (
              <>
                <ComboGlyph />
                {m.sentence}
              </>
            ),
          )}
        >
          <span aria-hidden="true" className={TOUCH_HIT_INLINE} style={{ color: "var(--fact)" }}>
            +{folded.length}
          </span>
        </FactTooltip>
      </span>
    );
  };
  return (
    <>
      {marks.map((m, i) => (
        <span key={m.kind === "fact" ? m.fact : "combo"} className={`inline-flex flex-none ${markFold(i)}`} data-mark={m.kind === "fact" ? m.fact : "combo"}>
          {m.kind === "fact" ? (
            <FactTooltip fact={m.fact}>
              <CardFactMark fact={m.fact} />
            </FactTooltip>
          ) : (
            m.glyph
          )}
        </span>
      ))}
      {shopping
        ? plusN(from(FOLD_FROM.shopping), FOLD.shopping.plus)
        : (
          <>
            {plusN(from(FOLD_FROM.all.wide), FOLD.all.plusWide)}
            {plusN(from(FOLD_FROM.all.mid), FOLD.all.plusMid)}
            {plusN(from(FOLD_FROM.all.tight), FOLD.all.plusTight)}
          </>
        )}
    </>
  );
}
