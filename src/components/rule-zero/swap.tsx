"use client";
// The swap (Rule 0 plan §PR 7; boards S1, S2, S6, W1, W2): `Closer to the table` on the viewer's own flagged seat, one
// tap to seat a nearer deck with no confirm, and the shared toast `Swapped to <deck>.` with `Undo`, which is a swap
// back. `TableLive` owns the state: it seats the deck through `swapSeatDeckAction`, adopts the table the action
// answers (the swapper's phone redraws first), and keeps the deck it replaced for Undo.

import { createContext, useContext } from "react";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import type { OfferDeck } from "../../lib/social/rule-zero-table";
import { verdictHead } from "../../lib/bracket/verdict-head";
import { BracketChip } from "../decks/bracket-chip";
import { FadingImg } from "../ui/hydrated-art";
import { TOUCH_HIT } from "../ui/touch-hit";

const copy = ruleZeroCopy.swap;

export type Swap = { offer: OfferDeck[]; middle: string | null; busy: boolean; swap: (deckId: string) => void };

export const SwapContext = createContext<Swap | null>(null);

export const useSwap = () => useContext(SwapContext);

/** `Closer to the table` (S1, S6, W1): up to three of the viewer's own decks, nearest first, each with `Swap in`. */
export function SeatOffer() {
  const swap = useSwap();
  if (!swap || swap.offer.length === 0 || swap.middle === null) return null;
  return (
    <section
      data-testid="seat-offer"
      aria-label={copy.title}
      className="relative mx-[12px] mb-[12px] flex flex-col gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[12px] [border:1px_solid_var(--border-strong)] xl:-mt-[4px] xl:mb-[14px] xl:ml-[162px] xl:mr-[16px]"
    >
      <div className="flex flex-col gap-[3px]">
        <b className="font-sans text-[14px] font-semibold text-[color:var(--fg)]">{copy.title}</b>
        <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.sub(swap.middle)}</span>
      </div>
      {swap.offer.map((d) => (
        <div key={d.deckId} className="flex min-h-[60px] items-center gap-[10px] rounded-[9px] bg-[color:var(--surface-rail)] p-[6px] [border:1px_solid_var(--border)]">
          <span aria-hidden className="relative h-[46px] w-[64px] flex-none overflow-hidden rounded-[7px] bg-[color:var(--surface)]">
            {d.artCropUri ? <FadingImg src={d.artCropUri} alt="" className="block h-full w-full object-cover" /> : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
            <b className="truncate whitespace-nowrap font-sans text-[13.5px] font-semibold text-[color:var(--fg)]">{d.name}</b>
            <DeckRowChip permits={d.permits} answered={d.answered} />
          </span>
          <button
            type="button"
            aria-disabled={swap.busy || undefined}
            aria-label={`${copy.swapIn}: ${d.name}`}
            onClick={() => (swap.busy ? undefined : swap.swap(d.deckId))}
            // Drawn at 36px; TOUCH_HIT gives a coarse pointer 44px, inside the row's 6px padding.
            className={`${TOUCH_HIT} inline-flex min-h-[36px] flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-[8px] bg-transparent px-[13px] font-sans text-[13px] font-semibold text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] aria-disabled:cursor-default aria-disabled:opacity-50`}
          >
            {copy.swapIn}
          </button>
        </div>
      ))}
    </section>
  );
}

/**
 * A Rule 0 deck row's bracket chip: the offer's and `Change deck`'s. An unanswered range names both brackets, which is
 * wider than the row's text column on a phone (in the offer, the art, the padding and `Swap in` leave about 130px at 390). Below 480px a range draws its marks alone, the
 * phone header's own yield (F18), with the name for a screen reader; one bracket, or a wider page, draws the whole chip.
 */
export function DeckRowChip({ permits, answered }: Pick<OfferDeck, "permits" | "answered">) {
  const head = verdictHead(permits, answered);
  if (!head.split) {
    return (
      <span className="flex items-center gap-[6px]">
        <BracketChip permits={permits} answered={answered} compact />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-[6px]">
      <span data-testid="offer-chip-marks" aria-hidden className="flex min-[480px]:hidden">
        <BracketChip permits={permits} answered={answered} face={false} compact />
      </span>
      <span className="sr-only min-[480px]:hidden">{head.face}</span>
      <span className="hidden min-[480px]:flex">
        <BracketChip permits={permits} answered={answered} compact />
      </span>
    </span>
  );
}
