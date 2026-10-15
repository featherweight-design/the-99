"use client";

/**
 * The Shopping head's key with I got it on (R2 review, A10; one grid since the foil addendum R3): `⇄ cheaper stand-ins`,
 * the friend-spare item's position, `[buy] press to add` and the outlined `over $N`, in one row on desktop (as the
 * Collection and Deck details keys sit) and a two-column grid on the phone. The spare item's position is EMPTY here: the
 * Social R2 spare press (a4's PR A) fills it, and until then nothing is drawn for a press that does not exist. Its own
 * host, because `StandInLimit` returns null without the swap tools, and the buy item draws then too: alone. With I got
 * it off this draws nothing and `StandInLimit` keeps main's ⇄ line (E1).
 */
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { useSwapTools } from "../../lib/swaps/context";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { formatLimit } from "../../lib/swaps/limit";
import { OVER_LIMIT_RING } from "./buy-tag";
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
      {/* The spare item sits here, between the stand-ins and the buy item (a4's PR A); empty until that press exists. */}
      <ShoppingKeyBuy />
      <ShoppingKeyOver />
    </div>
  );
}

/**
 * The key's `over $N` item (Social R2 PR 7, every width since the foil addendum R3): an outlined buy plate and `over $N`,
 * the one place the limit is drawn now that it no longer stacks on the tag (below `md` and from `lg`; the md-to-lg band
 * still stacks it). Only with the swap tools, which are what mark a row over a limit.
 */
export function ShoppingKeyOver() {
  const tools = useSwapTools();
  if (!tools) return null;
  return (
    <span className={ITEM} data-testid="shopping-key-over">
      <span
        className="rounded-[3px] px-[4px] text-[color:var(--warning)]"
        style={{ boxShadow: OVER_LIMIT_RING }}
      >
        {addPanelCopy.unowned.tag}
      </span>
      {swapToolsCopy.row.over(formatLimit(tools.limitCents))}
    </span>
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
