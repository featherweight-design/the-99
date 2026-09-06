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

  // Both figures drop rather than render as zero. No price at all is not
  // "$0.00", and a denominator that names nothing missing is a third copy of a
  // number the pill and the spine already carry.
  const showFigure = summary.pricedCopies > 0;
  const showClause = summary.pricedCopies < summary.totalCopies;

  return (
    <div className="font-mono text-[10.5px] md:text-[11px] leading-[1.5]">
      {showFigure || showClause ? (
        <p className="m-0" style={{ color: "var(--fg)" }}>
          {showFigure ? formatCents(summary.totalCents) : null}
          {showFigure && showClause ? (
            <span style={{ color: "var(--fg-faint)" }}>{" · "}</span>
          ) : null}
          {showClause ? (
            <span style={{ color: "var(--fg-faint)" }}>
              {priceCopy.strip.pricedClause(summary.pricedCopies, summary.totalCopies)}
            </span>
          ) : null}
        </p>
      ) : null}
      {/* --fg-locked in both forms. Old prices are our operational problem, not
          the player's error, and amber would spend the surface's loudest ink
          on something nothing here can act on. */}
      <p className="m-0" style={{ color: "var(--fg-locked)" }}>
        {[
          priceCopy.strip.provenance,
          priceCopy.strip.lastChecked(provenance.when),
          ...(provenance.behind ? [priceCopy.strip.behind] : []),
        ].join(" · ")}
      </p>
    </div>
  );
}
