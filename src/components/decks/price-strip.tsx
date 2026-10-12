// Price Strip — the Shopping filter's total, and the table's freshness.
//
// Its scope is the FILTER, not the deck: it sums what the Shopping list is
// showing. That is why it lives inside the GroupToggle container rather than on
// the builder spine — a deck-level header would make the total read as a
// property of the deck, and would overturn spine line 391's deliberate
// desktop-only omission sideways.
//
// ONE LAYOUT FOR BOTH WIDTHS (Hugh's ruling, #1222 follow-up). Desktop used to
// `flex-row-reverse` the figure to the far right with the provenance line and
// the buy link on the left — easily missed, and a second arrangement someone
// could drift from the phone's. It now reuses the phone's column exactly.

import { priceCopy } from "../../lib/copy/price";
import { tokensCopy } from "../../lib/copy/tokens";
import type { TokenShopping } from "../../lib/tokens/shopping";
import { exportLinkOutCopy } from "../../lib/copy/decks-builder";
import { formatCents, type PriceSummary, type ProvenanceForm } from "../../lib/decks/price";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import { ExternalLink } from "../ui/external-link";

export function PriceStrip({
  summary,
  provenance,
  shoppingCards,
  tokens = null,
  tokenProvenance = null,
  tokenOwnProvenance = null,
}: {
  summary: PriceSummary;
  /** Null when the table is empty or the read failed — the strip renders nothing. */
  provenance: ProvenanceForm | null;
  /**
   * The rows the Shopping filter is showing, which is exactly what the buy link
   * buys — the same `isShoppingCard` list the total above it sums. Passed rather
   * than derived so the strip stays a rendering of what is on screen.
   */
  shoppingCards: { name: string; quantity: number }[];
  /**
   * The tokens joined to this deck. The box's figure and link are what the link BUYS, so they take the tokens in;
   * `summary` stays the cards alone (the pill, the status and the roll-up read it), and the split line under the
   * figure keeps the two apart.
   */
  tokens?: TokenShopping | null;
  /** The older of the cards' and the tokens' price dates, when the tokens' are the older. Dates the combined figure. */
  tokenProvenance?: ProvenanceForm | null;
  /** The tokens' own price date: what dates a figure the cards contribute no priced copy to. */
  tokenOwnProvenance?: ProvenanceForm | null;
}) {
  // The figure includes priced tokens, so it is as old as the oldest price in it. A deck whose card prices are
  // unreadable (or whose table is empty) still dates a token total by the tokens' own feed.
  const dated = tokens && tokens.priced > 0
    ? (summary.pricedCopies === 0 ? tokenOwnProvenance : tokenProvenance) ?? provenance ?? tokenOwnProvenance
    : provenance;
  if (!dated) return null;

  const tokenN = tokens?.rows.length ?? 0;

  // Nothing to shop for is not a total of nothing. Every line the strip renders
  // is a claim about a list, and a provenance line above an empty one dates a
  // list with nothing in it. The rule lives here rather than at the call site so
  // it holds wherever the strip is mounted. A deck with nothing to buy but a joined token still has
  // something to buy.
  if (summary.totalCopies === 0 && tokenN === 0) return null;

  // Both figures drop rather than render as zero. No price at all is not
  // "$0.00", and a denominator that names nothing missing is a third copy of a
  // number the pill and the spine already carry.
  //
  // `0 of 8 priced` is the third case and also drops: a fraction whose numerator
  // is nothing is an arithmetic way of saying we have no prices, and line 2 now
  // says that in words. Before this pass it was what the strip rendered here.
  const pricedCopies = summary.pricedCopies + (tokens?.priced ?? 0);
  const totalCopies = summary.totalCopies + tokenN;
  const totalCents = summary.totalCents + (tokens?.cents ?? 0);
  const showFigure = pricedCopies > 0;
  const showClause = showFigure && pricedCopies < totalCopies;

  // Derived on every render from the list on screen. Not memoised: the row ✕
  // has no sync to perform, so the basket, the total and this href move
  // together or the link buys a card the player just removed.
  const buyHref = manapoolAddDeckUrl([...shoppingCards, ...(tokens?.lines ?? [])]);

  return (
    // ONE LAYOUT, both widths (Hugh's ruling, #1222 follow-up): the figure
    // tops the column, the provenance line and the buy link follow under it,
    // left-aligned — the phone's own arrangement, which desktop used to
    // reverse into a row that put the total at the far top-right and the
    // provenance/link on the left, easily missed. No `md:` override changes
    // this order; the only `md:` classes left are comfort padding.
    <div
      // The bottom padding is zero: the 44px link row below supplies it, and
      // 10px on top of a 44px target would read as a gap rather than as the
      // row's own height.
      className="mt-[10px] flex flex-col gap-[5px] rounded-[9px] border border-[color:var(--border)] px-[13px] pt-[10px] pb-0 md:px-[15px]"
      style={{ background: "var(--surface-sunken)" }}
    >
      {/* The clause cannot outlive the figure — it is a fraction OF it — so the
          figure's own condition governs the whole line. */}
      {showFigure ? (
        <p className="m-0 flex items-baseline gap-[7px] font-mono">
          <span className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>
            {formatCents(totalCents)}
          </span>
          {showClause ? (
            <span className="text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
              <span aria-hidden="true">{"· "}</span>
              {priceCopy.strip.pricedClause(pricedCopies, totalCopies)}
            </span>
          ) : null}
        </p>
      ) : null}
      {/* Where tokens are joined: the deck's own cost and the tokens' apart, under the figure that sums both. */}
      {tokens ? (
        <p className="m-0 font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
          {tokensCopy.strip.split(
            summary.totalCopies,
            summary.pricedCopies > 0 ? formatCents(summary.totalCents) : null,
            tokenN,
            tokens.priced > 0 ? formatCents(tokens.cents) : null,
          )}
        </p>
      ) : null}
      {/* The provenance line and the buy link stay one flex child rather than
          two siblings of the figure — a third top-level child would be a third
          row in the column rather than the link sitting under its own line. */}
      <div>
        {/* --fg-locked in both forms. Old prices are our operational problem, not
            the player's error, and amber would spend the surface's loudest ink
            on something nothing here can act on. */}
        <p className="m-0 font-mono text-[9.5px] leading-[1.5]" style={{ color: "var(--fg-locked)" }}>
          {[
            showFigure ? priceCopy.strip.provenance : priceCopy.strip.provenanceUnpriced,
            priceCopy.strip.lastChecked(dated.when),
            ...(dated.behind ? [priceCopy.strip.behind] : []),
          ].join(" · ")}
        </p>
        {/* The 44px is the ROW's height, never the link's box — the link stays
            inline text, so the words get a full-height target vertically while
            the focus ring still traces them rather than a plate. Held at both
            widths now: a pointer loses nothing from the extra height, and it
            is what keeps the layout one definition rather than two.

            The 9px gap holds at both breakpoints. `outline` takes no layout
            space, so the ring at 2px offset overlaps the gap rather than pushing
            the provenance line up.

            `buyHref` is null on an empty `shoppingCards`, which is not the same
            object the totalCopies guard above reads — the invariant that ties
            them lives in the caller, which sums the summary over the very list
            it passes here. So this is type narrowing rather than a second
            condition on the link, but only as long as that holds: a caller
            passing a summary from one list and rows from another would render a
            strip with nothing to buy from. */}
        {buyHref ? (
          <div className="mt-[9px] flex min-h-[44px] items-center">
            <ExternalLink href={buyHref} label={exportLinkOutCopy.shopping} />
          </div>
        ) : null}
        {/* What the link sends, said once: cards by name and quantity, tokens by set and number. */}
        {buyHref && tokens ? (
          <p className="m-0 pb-[10px] font-mono text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
            {tokensCopy.strip.sends(shoppingCards.length, tokens.lines.length)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
