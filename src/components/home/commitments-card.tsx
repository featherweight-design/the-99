// "Commitments" — the three figures the collection owes, desktop only.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md
// §CommitmentsCard. The phone frame draws no such card; the figures are not
// lost there, because /collection prints them at full size and `Review
// commitments` is the route to it.
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
function Row({ label, value, color }: { label: string; value: string; color: string }) {
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
}: {
  commitments: Commitments;
  shopping: ShoppingRollup;
  /**
   * The collection's total COPIES, from `getCollectionStats` — the denominator
   * of `Cards in use`, and the reason `inUse` is capped at what the player
   * holds. It is not on `Commitments`, which knows only about decks.
   */
  totalCards: number;
}) {
  const c = refreshCopy.home;
  return (
    <section className="hidden sm:flex sm:flex-col sm:gap-[11px]">
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
          value={c.inUseValue(
            commitments.inUse.toLocaleString("en-US"),
            totalCards.toLocaleString("en-US"),
          )}
          color="var(--accent)"
        />
        <Row
          label={c.overCommittedRow}
          value={c.overCommittedValue(commitments.overCommitted)}
          color="var(--danger)"
        />
        <Row
          label={c.toBuyRow}
          // Copies and money, both from the one roll-up every Shopping surface
          // reads. An unpriced copy still counts in the left figure and not in
          // the right: the feed omits an out-of-stock card rather than pricing
          // it at zero, and nothing here is free.
          value={c.toBuyValue(shopping.total.copies, formatCents(shopping.total.cents))}
          color="var(--fg)"
        />

        {/* The collection's availability view, filtered to the two states these
            rows count — cards a finished deck has sleeved, and cards more than
            one has claimed. `/collection` with no filter would be the whole
            collection, which is not what "review" means here. */}
        <GhostButton
          href="/collection?avail=inuse,over"
          className="mt-[2px] flex h-[32px] w-full items-center justify-center rounded-[8px] text-[12.5px] font-normal"
        >
          {c.reviewCommitments}
        </GhostButton>
      </div>
    </section>
  );
}
