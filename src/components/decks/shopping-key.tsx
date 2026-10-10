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
      className="mt-[6px] grid grid-cols-2 items-center gap-x-[12px] gap-y-[6px] px-[2px] md:flex md:flex-wrap md:gap-x-[22px] md:px-[4px]"
    >
      {tools ? (
        <span className={ITEM}>
          <span aria-hidden="true" className="w-[18px] text-center text-[15px] leading-none text-[color:var(--warning)]">⇄</span>
          {gotItCopy.row.keySwap}
        </span>
      ) : null}
      <span className={ITEM}>
        <span className="rounded-[3px] px-[4px] text-[color:var(--warning)] bg-[color-mix(in_oklab,var(--warning)_13%,transparent)]">
          {addPanelCopy.unowned.tag}
        </span>
        {gotItCopy.row.keyBuy}
      </span>
    </div>
  );
}
