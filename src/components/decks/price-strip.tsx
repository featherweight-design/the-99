// Price Strip — the Shopping filter's total, and the table's freshness.
//
// Its scope is the FILTER, not the deck: it sums what the Shopping list is
// showing. That is why it lives inside the GroupToggle container rather than on
// the builder spine — a deck-level header would make the total read as a
// property of the deck, and would overturn spine line 391's deliberate
// desktop-only omission sideways.

import { priceCopy } from "../../lib/copy/price";
import { formatCents, type PriceSummary, type ProvenanceForm } from "../../lib/decks/price";

export function PriceStrip({
  summary,
  provenance,
}: {
  summary: PriceSummary;
  /** Null when the table is empty or the read failed — the strip renders nothing. */
  provenance: ProvenanceForm | null;
}) {
  if (!provenance) return null;

  // Nothing to shop for is not a total of nothing. Every line the strip renders
  // is a claim about a list, and a provenance line above an empty one dates a
  // list with nothing in it. The rule lives here rather than at the call site so
  // it holds wherever the strip is mounted.
  if (summary.totalCopies === 0) return null;

  // Both figures drop rather than render as zero. No price at all is not
  // "$0.00", and a denominator that names nothing missing is a third copy of a
  // number the pill and the spine already carry.
  const showFigure = summary.pricedCopies > 0;
  const showClause = summary.pricedCopies < summary.totalCopies;

  return (
    // One DOM order, two arrangements. The phone stacks figure over provenance;
    // desktop puts the provenance first on the line and the figure at its end,
    // which `flex-row-reverse` + `justify-between` reach without a second
    // subtree — two branches would pass a width-by-width review while being
    // two components that can drift.
    <div
      className="mt-[10px] flex flex-col gap-[5px] rounded-[9px] border border-[color:var(--border)] px-[13px] py-[10px] md:flex-row-reverse md:items-baseline md:justify-between md:gap-[14px] md:px-[15px] md:py-[11px]"
      style={{ background: "var(--surface-sunken)" }}
    >
      {showFigure || showClause ? (
        <p className="m-0 flex items-baseline gap-[7px] font-mono">
          {showFigure ? (
            <span className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>
              {formatCents(summary.totalCents)}
            </span>
          ) : null}
          {showClause ? (
            <span className="text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
              {showFigure ? (
                <span aria-hidden="true">{"· "}</span>
              ) : null}
              {priceCopy.strip.pricedClause(summary.pricedCopies, summary.totalCopies)}
            </span>
          ) : null}
        </p>
      ) : null}
      {/* --fg-locked in both forms. Old prices are our operational problem, not
          the player's error, and amber would spend the surface's loudest ink
          on something nothing here can act on. */}
      <p className="m-0 font-mono text-[9.5px] leading-[1.5]" style={{ color: "var(--fg-locked)" }}>
        {[
          priceCopy.strip.provenance,
          priceCopy.strip.lastChecked(provenance.when),
          ...(provenance.behind ? [priceCopy.strip.behind] : []),
        ].join(" · ")}
      </p>
    </div>
  );
}
