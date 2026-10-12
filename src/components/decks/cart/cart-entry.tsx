// CartEntry — the way into Shopping for all decks from `/decks` (handoff A1, A1-np). A CELL only,
// with no padding of its own: the row that holds it owns the gutters, so a second cell (the
// precons line, Hugh 2026-10-11) can sit beside it at half width without either changing.

import Link from "next/link";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { formatCents } from "../../../lib/decks/price";
import type { DeckShopping } from "../../../lib/decks/shopping-rollup";
import { PendingReporter } from "../../shell/pending-reporter";

export function CartEntry({ total, deckCount }: { total: DeckShopping; deckCount: number }) {
  return (
    <Link
      href="/decks/shopping"
      className="flex min-h-[56px] min-w-0 flex-1 items-center gap-[12px] rounded-[10px] border border-[color:var(--border-strong)] bg-[var(--surface)] px-[14px] py-[9px]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[14px] font-medium text-[color:var(--fg)] [text-wrap:pretty]">{copy.entry.label}</span>
        {/* A missing price is never $0.00 (A1-np): the figure drops to copies and decks. */}
        <span className="font-mono text-[11px] text-[color:var(--fg-muted)] [text-wrap:pretty]">
          {total.cents > 0
            ? copy.entry.figure(total.copies, formatCents(total.cents), deckCount)
            : copy.entry.figureNoPrice(total.copies, deckCount)}
        </span>
      </span>
      <span aria-hidden className="flex-none text-[18px] text-[color:var(--fg-muted)]">›</span>
      <PendingReporter href="/decks/shopping" />
    </Link>
  );
}
