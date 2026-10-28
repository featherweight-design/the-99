// The cart's column header (v2 call 1, D1): one row above the list on desktop, naming each fact's column, so a row
// carries its figures without a label on each. By card only for now: `Card · You need · for · Friends' spares · You
// own · in use in`, then the action stack's column, unlabelled. The phone has no header; its facts carry their labels.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";

/** By card's desktop grid, shared by the header and every row so the columns line up. */
export const BY_CARD_GRID =
  "md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.55fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_100px] md:gap-x-[18px]";

/**
 * Above the list's scroll box, so it never scrolls with the rows. Hidden from a screen reader: each fact names itself
 * (its phone label, kept as `sr-only` on desktop). The negative bottom margin takes back the section's gap, so the rule
 * sits on the list as the board draws it. It reserves the list box's scrollbar gutter (`scrollbar-gutter: stable`, which
 * needs an overflow other than visible), so a classic scrollbar narrows its grid as much as the rows'.
 */
export function CartColumns() {
  return (
    <div
      aria-hidden
      data-cart-columns
      className={`hidden whitespace-nowrap border-b border-b-[color:var(--border-strong)] px-[14px] pb-[7px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] md:-mb-[12px] md:grid md:overflow-y-hidden md:[scrollbar-gutter:stable] ${BY_CARD_GRID}`}
    >
      <span>{copy.columns.card}</span>
      <span>{copy.columns.need}</span>
      <span>{copy.columns.spares}</span>
      <span>{copy.columns.own}</span>
      <span className="text-right" />
    </div>
  );
}
