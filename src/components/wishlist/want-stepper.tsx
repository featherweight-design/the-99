"use client";

import { useEffect, useRef } from "react";

/**
 * The wishlist's want stepper (Social R2, boards W2/WP2 and D2/DP2): `− N +` in a box, the count ruled off on both
 * sides. The tab's search results and card details' Wishlist section both draw it, so it is one component.
 *
 * The caller owns the count and the write: a press calls `onChange` with the next count at once, and the caller puts
 * the old count back if its save fails (the toast is the caller's too). At `min` the − does nothing, and at `max` the
 * + does nothing; both stay pressable and focusable, marked `aria-disabled`, so focus never falls out of the box.
 * Removing a card is a separate control, never the − at 1.
 *
 * The count is a live region, so a step is read out. `focusOnMount` moves focus to the + when the stepper first
 * draws, for the Add to wishlist press that turns into it in place, so the reader's focus is not dropped.
 *
 * Phone: each press 44×44 (the tap target), so the box is 46px with its 1px border. Desktop (`md`): 34px tall, each
 * press 32×30, for a pointer. A coarse pointer at desktop width (a tablet) keeps the phone's sizes (d9's ruling).
 */
export function WantStepper({
  value,
  onChange,
  fewerLabel,
  moreLabel,
  countLabel,
  min = 1,
  max = 99,
  focusOnMount = false,
}: {
  value: number;
  onChange: (next: number) => void;
  fewerLabel: string;
  moreLabel: string;
  /** The count's accessible name, e.g. "want". */
  countLabel: string;
  min?: number;
  max?: number;
  focusOnMount?: boolean;
}) {
  const more = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusOnMount) more.current?.focus();
    // Only on the first draw: a later re-render must not pull focus back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const atMin = value <= min;
  const atMax = value >= max;
  const press =
    "flex h-[44px] w-[44px] md:h-[32px] md:w-[30px] md:pointer-coarse:h-[44px] md:pointer-coarse:w-[44px] items-center justify-center cursor-pointer bg-transparent border-0 p-0 font-mono text-[15px] md:text-[14px] leading-none rounded-[6px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--accent)]";
  const ink = (off: boolean) => (off ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg-body)] hover:text-[color:var(--fg)]");
  return (
    <span
      className="inline-flex flex-none items-center h-[46px] md:h-[34px] md:pointer-coarse:h-[46px] rounded-[8px] border border-[color:var(--border-strong)] overflow-hidden"
      data-testid="want-stepper"
    >
      <button
        type="button"
        aria-label={fewerLabel}
        aria-disabled={atMin || undefined}
        onClick={() => !atMin && onChange(value - 1)}
        className={`${press} ${ink(atMin)}`}
      >
        {"−"}
      </button>
      <output
        aria-label={countLabel}
        aria-live="polite"
        className="flex h-full min-w-[30px] items-center justify-center px-[6px] border-x border-[color:var(--border-strong)] font-mono text-[14px] font-semibold tabular-nums text-[color:var(--fg)]"
      >
        {value}
      </output>
      <button
        ref={more}
        type="button"
        aria-label={moreLabel}
        aria-disabled={atMax || undefined}
        onClick={() => !atMax && onChange(value + 1)}
        className={`${press} ${ink(atMax)}`}
      >
        +
      </button>
    </span>
  );
}
