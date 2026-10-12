// CartEntry — the way into Shopping for all decks from `/decks` (handoff A1, A1-np). A CELL only,
// with no padding of its own: the row that holds it owns the gutters, so a second cell (the
// precons line, Hugh 2026-10-11) can sit beside it at half width without either changing.

import Link from "next/link";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { formatCents } from "../../../lib/decks/price";
import type { DeckShopping } from "../../../lib/decks/shopping-rollup";
import { PendingReporter } from "../../shell/pending-reporter";

/**
 * `paired`: the precons line shares the row (precons R2, P1), so at 390 the cell is a half cell with
 * the short title and figure; from 640 it is the approved line either way. Unpaired, the cell is the
 * approved line at every width, as the cart shipped (P4).
 */
export function CartEntry({ total, deckCount, paired = false }: { total: DeckShopping; deckCount: number; paired?: boolean }) {
  const full = (
    <>
      <span className="text-[14px] font-medium text-[color:var(--fg)] [text-wrap:pretty]">{copy.entry.label}</span>
      {/* A missing price is never $0.00 (A1-np): the figure drops to copies and decks. */}
      <span className="font-mono text-[11px] text-[color:var(--fg-muted)] [text-wrap:pretty]">
        {total.cents > 0
          ? copy.entry.figure(total.copies, formatCents(total.cents), deckCount)
          : copy.entry.figureNoPrice(total.copies, deckCount)}
      </span>
    </>
  );
  return (
    <Link
      href="/decks/shopping"
      className={paired
        ? "flex min-h-[52px] min-w-0 flex-1 items-center gap-[6px] rounded-[10px] border border-[color:var(--border-strong)] bg-[var(--surface)] p-[7px_8px_7px_12px] sm:min-h-[56px] sm:gap-[12px] sm:px-[14px] sm:py-[9px]"
        : "flex min-h-[56px] min-w-0 flex-1 items-center gap-[12px] rounded-[10px] border border-[color:var(--border-strong)] bg-[var(--surface)] px-[14px] py-[9px]"}
    >
      {paired ? (
        <>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px] sm:hidden">
            <span className="text-[13.5px] font-medium text-[color:var(--fg)]">{copy.entry.titlePhone}</span>
            <span className="whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-muted)]">
              {total.cents > 0 ? copy.entry.figurePhone(total.copies, formatCents(total.cents)) : copy.entry.figurePhoneNoPrice(total.copies)}
            </span>
          </span>
          <span className="hidden min-w-0 flex-1 flex-col gap-[3px] sm:flex">{full}</span>
        </>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">{full}</span>
      )}
      <span aria-hidden className={`flex-none text-[color:var(--fg-muted)] ${paired ? "text-[16px] sm:text-[18px]" : "text-[18px]"}`}>›</span>
      <PendingReporter href="/decks/shopping" />
    </Link>
  );
}
