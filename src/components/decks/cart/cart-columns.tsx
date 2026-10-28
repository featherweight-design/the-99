// The cart's column header (v2 call 1, D1): one row on desktop naming each fact's column, so a row carries its figures
// without a label on each. By card: `Card · You need · for · Friends' spares · You own · in use in`, above the list. By
// deck: the need column is `This deck · also`, and each open group draws its own header over its rows. The action
// stack's column is unlabelled. The phone has no header; its facts carry their labels.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";

/**
 * The v2 desktop grid, By card's and By deck's (the board draws both alike), shared by the header and every row so the
 * columns line up. It starts at `xl` (1280px), not the cart's `md`: under the deck picker the list is about 616px wide
 * at a 1000px window and 640 at 1024 (signed in, the 62px rail), where the spare and own columns come to 87 to 96px and
 * their nowrap headings overflow; at 1280 the list is 896 and every heading fits. Below `xl` a row draws the phone's
 * labelled lines, header, grid and `sr-only` labels all switching together (`cart-facts.tsx`, `CartFactsRow`).
 */
export const FACTS_GRID =
  "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.55fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_100px] xl:gap-x-[18px]";

/**
 * Hidden from a screen reader: each fact names itself (its phone label, kept as `sr-only` on desktop).
 *
 * By card's sits above the list's scroll box, so it never scrolls with the rows. The negative bottom margin takes back
 * the section's gap, so the rule sits on the list as the board draws it. It reserves the list box's scrollbar gutter
 * (`scrollbar-gutter: stable`, which needs an overflow other than visible), so a classic scrollbar narrows its grid as
 * much as the rows'.
 *
 * By deck's sits inside an open group, at the group body's inset (the board's `.dg .bd2 .colh`, no padding across), and
 * scrolls with it.
 */
export function CartColumns({ view = "card" }: { view?: "card" | "deck" }) {
  const byDeck = view === "deck";
  return (
    <div
      aria-hidden
      data-cart-columns={view}
      className={`hidden whitespace-nowrap border-b border-b-[color:var(--border-strong)] pb-[7px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] xl:grid ${
        byDeck ? "" : "px-[14px] xl:-mb-[12px] xl:overflow-y-hidden xl:[scrollbar-gutter:stable]"
      } ${FACTS_GRID}`}
    >
      <span>{copy.columns.card}</span>
      <span>{byDeck ? copy.columns.needByDeck : copy.columns.need}</span>
      <span>{copy.columns.spares}</span>
      <span>{copy.columns.own}</span>
      <span className="text-right" />
    </div>
  );
}
