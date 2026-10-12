"use client";

/**
 * The Shopping head's key with I got it on (R2 review, A10): two short items, `⇄ cheaper stand-ins`
 * and `[buy] bought it? press to add it`, in one row on desktop (as the Collection and Deck details
 * keys sit) and a two-column grid on the phone. Its own host, because `StandInLimit` returns null
 * without the swap tools, and the buy item draws then too: alone. With I got it off this draws
 * nothing and `StandInLimit` keeps main's ⇄ line (E1).
 */
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { useSwapTools } from "../../lib/swaps/context";
import { useGotIt } from "./got-it";

const ITEM = "flex items-center gap-[7px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]";

export function ShoppingKey({ shoppingCount }: { shoppingCount: number }) {
  const gotIt = useGotIt();
  const tools = useSwapTools();
  if (!gotIt || shoppingCount === 0) return null;
  return (
    <div
      data-testid="shopping-key"
      // Phone: a two-column grid with 10px above and 10px below. From lg (where the Shopping row
      // goes to one line): one wrapping row, 6px above.
      className="mt-[10px] grid grid-cols-2 items-center gap-x-[12px] gap-y-[6px] px-0 pb-[10px] lg:mt-[6px] lg:flex lg:flex-wrap lg:gap-x-[22px] lg:px-[4px] lg:pb-0"
    >
      {tools ? (
        <span className={ITEM}>
          <span aria-hidden="true" className="w-[18px] text-center text-[15px] leading-none text-[color:var(--warning)]">⇄</span>
          {gotItCopy.row.keySwap}
        </span>
      ) : null}
      <ShoppingKeyBuy />
    </div>
  );
}

/** The key's buy item on its own: the all-decks cart draws it alone beside its view switch. */
export function ShoppingKeyBuy() {
  return (
    <span className={ITEM}>
      <span className="rounded-[3px] px-[4px] text-[color:var(--warning)] bg-[color-mix(in_oklab,var(--warning)_13%,transparent)]">
        {addPanelCopy.unowned.tag}
      </span>
      {gotItCopy.row.keyBuy}
    </span>
  );
}
