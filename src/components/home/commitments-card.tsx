// "Commitments" — the three figures the collection owes, at both widths.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md
// §CommitmentsCard. The same component, the same three figures and the same
// control on a phone as on a desktop; it is mounted last there, because it is
// the block you read rather than the one you act on, and the two CTAs and the
// buildable commanders are above it on desktop too — so the phone order matches
// rather than being invented. On desktop it is now the whole right rail, the
// deck list that sat above it having left.
//
// Nothing is computed here. `commitmentFigures` and `loadShoppingRollup` are
// the two sources, and both are read once per page — a figure recomputed in a
// component is a figure that can disagree with the surface it came from.
//
// Home does the null check: Task 14's loader nulls `commitments` when the
// availability read throws, and a card of three zeroes after a failed query is
// a lie. This component takes a non-null `Commitments`.
//
// Placement inside the two-column §HomeBody belongs to the layout task; this
// draws the section and nothing around it.

import { GhostButton } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import type { ReactNode } from "react";
import { refreshCopy } from "../../lib/copy/refresh";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { formatCents } from "../../lib/decks/price";
import type { Commitments } from "../../lib/home/commitments";

/**
 * The three figures do not share a colour, and the difference is the content:
 * a claim made on purpose, a claim that cannot be honoured, and money owed.
 *
 * The middle row keeps `--danger` at zero. Recolouring a row when its figure
 * reaches zero would make the palette a second, quieter status system, and
 * `0 cards` in that colour reads as what it is — the row that would be red if
 * it were not zero.
 */
function Row({ label, value, color }: { label: string; value: ReactNode; color: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] text-[color:var(--fg-body)]">{label}</span>
      <span className="font-mono text-[13px] tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export function CommitmentsCard({
  commitments,
  shopping,
  totalCards,
  cartEnabled = false,
}: {
  commitments: Commitments;
  shopping: ShoppingRollup;
  /**
   * The collection's total COPIES, from `getCollectionStats` — the denominator
   * of `Cards in use`, and the reason `inUse` is capped at what the player
   * holds. It is not on `Commitments`, which knows only about decks.
   */
  totalCards: number;
  /** The all-decks cart's switch for this reader. Off, the card keeps its one button. */
  cartEnabled?: boolean;
}) {
  const c = refreshCopy.home;
  return (
    <section className="flex flex-col gap-[12px] min-[1180px]:gap-[11px]">
      {/* §SectionLabel, with this instance's own `margin-top: 4`. */}
      <h2 className="m-0 mt-[4px] flex-none font-mono text-[10px] font-normal tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        {c.commitmentsHeading}
      </h2>

      <div className="flex flex-col gap-[11px] rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-inset)] p-[14px]">
        <Row
          label={c.inUseRow}
          // Thousands separators at the call site: `n` in commander-explained.ts
          // is that file's own private helper, and the rest of Home formats
          // here rather than exporting it.
          value={
            <CountUp
              value={commitments.inUse}
              text={(n) => c.inUseValue(n.toLocaleString("en-US"), totalCards.toLocaleString("en-US"))}
            />
          }
          color="var(--accent)"
        />
        <Row
          label={c.overCommittedRow}
          value={<CountUp value={commitments.overCommitted} text={c.overCommittedValue} />}
          color="var(--danger)"
        />
        <Row
          label={c.toBuyRow}
          // Copies and money, both from the one roll-up every Shopping surface
          // reads. An unpriced copy still counts in the left figure and not in
          // the right: the feed omits an out-of-stock card rather than pricing
          // it at zero, and nothing here is free.
          value={
            <CountUp
              value={shopping.total.copies}
              text={(n) => c.toBuyValue(n, formatCents(shopping.total.cents))}
            />
          }
          color="var(--fg)"
        />

        {/* The collection's availability view, filtered to OVER-COMMITTED alone
            (H2, Hugh 2026-10-02): the cards more committed decks want than you own,
            which are the ones to review. It used to add `in use` too, and on a real
            collection that buried 43 over-committed cards under 1,015 that are
            merely sleeved, which needs no review. `/collection` with no filter
            would be the whole collection, which is not what "review" means here. */}
        {/* Beside it when the cart is on, two equal halves like `New deck` and `Import a deck`
            at every width: the figures say what is short, and the second button is where to buy it. */}
        <div className="mt-[2px] grid grid-cols-1 gap-[8px] min-[360px]:data-[two]:grid-cols-2" data-two={cartEnabled ? "" : undefined}>
          <GhostButton
            href="/collection?avail=over"
            // 44 on a phone, 32 above it. The card was desktop-only when this was
            // written, so it kept the desktop form at every width; it is the last
            // block on the phone now and its control is a tap target.
            className="flex h-[44px] w-full min-w-0 items-center justify-center whitespace-nowrap rounded-[8px] px-[8px] text-[12.5px] font-normal sm:h-[32px]"
          >
            {c.reviewCommitments}
          </GhostButton>
          {cartEnabled && (
            <GhostButton
              href="/decks/shopping"
              className="flex h-[44px] w-full min-w-0 items-center justify-center whitespace-nowrap rounded-[8px] px-[8px] text-[12.5px] font-normal sm:h-[32px]"
            >
              {c.shopAllDecks}
            </GhostButton>
          )}
        </div>
      </div>
    </section>
  );
}
