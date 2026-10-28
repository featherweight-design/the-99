// The cart's column header (v2 call 1, D1): one row above the list on desktop, naming each fact's column, so a row
// carries its figures without a label on each. By card only for now: `Card · You need · for · Friends' spares · You
// own · in use in`, then the action stack's column, unlabelled. The phone has no header; its facts carry their labels.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";

/**
 * By card's desktop grid, shared by the header and every row so the columns line up. It starts at `xl` (1280px), not
 * the cart's `md`: under the deck picker the list is about 616px wide at a 1000px window and 640 at 1024 (signed in,
 * the 62px rail), where the spare and own columns come to 87 to 96px and their nowrap headings overflow; at 1280 the
 * list is 896 and every heading fits. Below `xl` a row draws the phone's labelled lines, header, grid and `sr-only`
 * labels all switching together (`cart-facts.tsx`, `CartCardLine`).
 */
export const BY_CARD_GRID =
  "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.55fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_100px] xl:gap-x-[18px]";

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
      className={`hidden whitespace-nowrap border-b border-b-[color:var(--border-strong)] px-[14px] pb-[7px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] xl:-mb-[12px] xl:grid xl:overflow-y-hidden xl:[scrollbar-gutter:stable] ${BY_CARD_GRID}`}
    >
      <span>{copy.columns.card}</span>
      <span>{copy.columns.need}</span>
      <span>{copy.columns.spares}</span>
      <span>{copy.columns.own}</span>
      <span className="text-right" />
    </div>
  );
}
