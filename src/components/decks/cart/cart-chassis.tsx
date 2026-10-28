"use client";

// The cart's filter chassis (handoff Controls A2, B2; plan PR 8): the app's one filter frame (`ui/filter-chassis`) under the
// view switch, with search and the view's sort in row 1, the search as a chip in row 2 and the cart's sentence in row 3,
// which REPLACES the list head. Friend and Owned arrive with PR 9, so the row holds the two controls the cart has:
//   - 1000px and up: the search field, then `Sort · <current> ▾` past the hairline;
//   - below it: the search field, then the ⇅ button (44px) that opens the view's orders as a sheet.
// Search and Friend narrow the same lines in every view and the sort is the view's own, so this takes the view's order
// set and its value and knows nothing about which view it is beyond the sheet's sub-line.

import { useState } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { CART_SORTS, type CartView } from "../../../lib/decks/cart-sort";
import { CHASSIS_WIDE_MIN_PX, FilterChassis, type FilterChip } from "../../ui/filter-chassis";
import { useMinWidth } from "../../ui/use-min-width";
import { DeckSearchField } from "../deck-filter-column";
import { OrderMenu } from "../deck-sort-menu";
import { CartSortSheet } from "./cart-sort-sheet";

/** The longest search a chip draws before it ends in an ellipsis. */
const CHIP_TERM_MAX = 24;

const LABELS: Record<CartView, Readonly<Record<string, string>>> = {
  card: copy.sort.byCard,
  deck: copy.sort.byDeck,
  friend: copy.sort.byFriend,
};

export function CartChassis({
  view, query, onQuery, sort, onSort, resultLine, reading,
}: {
  view: CartView;
  /** The search, as typed. */
  query: string;
  onQuery: (next: string) => void;
  /** The view's order, one of `CART_SORTS[view]`. */
  sort: string;
  onSort: (next: string) => void;
  /** Row 3's sentence, finished by the cart. */
  resultLine: string;
  /** Friends' spares are still being read: the result line's trailing slot says so. */
  reading: boolean;
}) {
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);
  const [sheet, setSheet] = useState(false);
  // The sheet belongs to the compact form: crossing into the wide one closes it, so it cannot reopen on the way back.
  if (wide && sheet) setSheet(false);
  const order = CART_SORTS[view];
  const labels = LABELS[view];
  const term = query.trim();
  // A long term is cut for the eye and spoken whole, so the chip and its ✕ stay inside a phone's width.
  const shortTerm = term.length > CHIP_TERM_MAX ? `${term.slice(0, CHIP_TERM_MAX)}…` : term;
  const chips: FilterChip[] = term ? [{
    key: "q", label: copy.filters.chipSearch(shortTerm), spoken: shortTerm === term ? undefined : copy.filters.chipSearch(term), onRemove: () => onQuery(""),
  }] : [];
  const trigger = copy.sort.trigger(labels[sort]);
  return (
    <FilterChassis
      form={wide ? "wide" : "compact"}
      controls={
        <div className="min-w-0 flex-auto">
          <DeckSearchField
            value={query}
            onChange={onQuery}
            size={wide ? "column" : "sheet"}
            active={term !== ""}
            placeholder={copy.filters.search}
          />
        </div>
      }
      sort={
        wide ? (
          <OrderMenu
            value={sort}
            order={order}
            labels={labels}
            triggerLabel={copy.sort.trigger}
            heading={copy.sort.sheetAria}
            onChange={onSort}
          />
        ) : (
          <button
            type="button"
            aria-label={trigger}
            aria-haspopup="dialog"
            aria-expanded={sheet}
            onClick={() => setSheet(true)}
            className={`flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[8px] border border-solid bg-transparent p-0 font-sans text-[12.5px] font-medium text-[color:var(--fg-body)] ${
              // Controls B2: the button reads as open while its sheet is.
              sheet ? "border-[color:var(--accent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_18%,transparent)]" : "border-[color:var(--border-strong)]"
            }`}
          >
            <span aria-hidden>⇅</span>
          </button>
        )
      }
      chips={chips}
      onClearAll={() => onQuery("")}
      resultLine={resultLine}
      silentResult={!wide && sheet}
      resultTrailing={
        reading ? (
          <span className="flex items-center gap-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            <span aria-hidden className="h-[6px] w-[6px] flex-none rounded-full bg-[color:var(--fact)]" />
            {copy.result.reading}
          </span>
        ) : null
      }
      after={
        wide ? null : (
          <CartSortSheet
            open={sheet}
            view={view}
            value={sort}
            order={order}
            labels={labels}
            onPick={(next) => { onSort(next); setSheet(false); }}
            onDismiss={() => setSheet(false)}
          />
        )
      }
    />
  );
}
