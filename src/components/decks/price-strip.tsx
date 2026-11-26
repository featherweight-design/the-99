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

import { useId } from "react";
import { priceCopy } from "../../lib/copy/price";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { formatLimit } from "../../lib/swaps/limit";
import { useSwapTools } from "../../lib/swaps/context";
import { DeckBox, DeckBoxBand, DeckBoxFoot } from "./deck-box";
import { tokensCopy } from "../../lib/copy/tokens";
import type { TokenShopping } from "../../lib/tokens/shopping";
import { exportLinkOutCopy } from "../../lib/copy/decks-builder";
import { formatCents, type PriceSummary, type ProvenanceForm } from "../../lib/decks/price";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import { ExternalLink } from "../ui/external-link";
import { storeCopy } from "../../lib/copy/store";
import { StoreDoor } from "../stores/store-door";
import { StorePasteRow } from "../stores/store-paste-row";
import { useStoreInfo } from "../stores/store-provider";

export function PriceStrip({
  summary,
  provenance,
  shoppingCards,
  tokens = null,
  tokenProvenance = null,
  tokenOwnProvenance = null,
  overCount = 0,
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
  /** Shopping rows over the deck's limit: the Over cell's figure. The cell is drawn with the swap tools alone. */
  overCount?: number;
}) {
  const store = useStoreInfo();
  const tools = useSwapTools();
  const headingId = useId();
  // The figure includes priced tokens, so it is as old as the oldest price in it. A deck whose card prices are
  // unreadable (or whose table is empty) still dates a token total by the tokens' own feed.
  // Which feeds the figure draws on: the rows that carry a price when any does, else the rows themselves.
  const anyPriced = summary.pricedCopies > 0 || (tokens?.priced ?? 0) > 0;
  const cardsIn = anyPriced ? summary.pricedCopies > 0 : summary.totalCopies > 0;
  const tokensIn = tokens !== null && (anyPriced ? tokens.priced > 0 : tokens.rows.length > 0);
  const dated = tokensIn
    // Tokens alone: their own feed's date, even when it is the newer one. Both: the older of the two (the
    // page supplies `tokenProvenance` only when the tokens' is the older).
    ? (cardsIn ? tokenProvenance ?? provenance ?? tokenOwnProvenance : tokenOwnProvenance ?? provenance)
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
  // A store with no whole-list link (store choice, call 6) gets no buy link: the paste row stands in, cards only, since
  // its paste page reads names and a token's name can be a card's.
  const buyHref = store.cart ? manapoolAddDeckUrl([...shoppingCards, ...(tokens?.lines ?? [])]) : null;

  const box = priceCopy.strip.box;
  const noteClass = "m-0 font-mono text-[11px] leading-[1.5]";
  const cellClass = "flex min-w-0 flex-col gap-[5px] px-[14px] py-[14px] md:px-[16px] [border-left:1px_solid_var(--border)] first:[border-left:0]";
  const labelClass = "font-mono text-[10px] font-medium uppercase tracking-[.12em]";
  const limitFigure = tools ? formatLimit(tools.limitCents) : null;
  const behindNotes = [
    ...(dated.behind ? [priceCopy.strip.behind] : []),
    // Only beside a figure: why the cart the link builds can cost more than it.
    ...(showFigure && store.cart ? [priceCopy.strip.cartNote] : []),
  ].join(" · ");

  return (
    // The To buy box (R3-YourDeck): the band's total, then Total / Over / Last checked, then the buy link in the foot.
    // One layout for both widths still (Hugh's ruling, #1222 follow-up): the cells only reflow, two then one on a phone.
    <DeckBox data-price-strip="" aria-labelledby={headingId} className="!mt-[10px] md:!mt-[10px]">
      <DeckBoxBand
        id={headingId}
        title={box.title}
        count={box.count(summary.totalCopies + tokenN)}
      />
      <div className={`grid grid-cols-2 ${tools ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <div className={cellClass}>
          <span className={labelClass} style={{ color: "var(--fg-faint)" }}>{box.total}</span>
          <span className="text-[17px] font-semibold" style={{ color: "var(--fg)" }}>
            {showFigure ? formatCents(totalCents) : box.unpriced}
          </span>
          {showClause ? (
            <span className={noteClass} style={{ color: "var(--fg-faint)" }}>{priceCopy.strip.pricedClause(pricedCopies, totalCopies)}</span>
          ) : null}
          {tokens ? (
            <p className={noteClass} style={{ color: "var(--fg-muted)" }}>
              {tokensCopy.strip.split(
                summary.totalCopies,
                summary.pricedCopies > 0 ? formatCents(summary.totalCents) : null,
                tokenN,
                tokens.priced > 0 ? formatCents(tokens.cents) : null,
              )}
            </p>
          ) : null}
          <p className={noteClass} style={{ color: "var(--fg-locked)" }}>
            {[
              showFigure ? storeCopy.provenance(store) : storeCopy.provenanceUnpriced(store),
              // A market figure is an average of sales, said beside the figure it qualifies (call 4).
              ...(showFigure && store.figure === "market" ? [storeCopy.marketNote] : []),
            ].join(" · ")}
            <StoreDoor />
          </p>
        </div>
        {tools && limitFigure ? (
          <div className={cellClass}>
            <span className={labelClass} style={{ color: "var(--fg-faint)" }}>{box.over(limitFigure)}</span>
            <span className="text-[17px] font-semibold" style={{ color: "var(--fg)" }}>{box.overValue(overCount)}</span>
            <span className={noteClass} style={{ color: "var(--fg-faint)" }}>
              {[box.overNote(limitFigure), ...(tools.storedLimitCents === null ? [swapToolsCopy.limit.defaultChip] : [])].join(" · ")}
            </span>
          </div>
        ) : null}
        <div className={`${cellClass} ${tools ? "col-span-2 md:col-span-1 max-md:[border-left:0] max-md:[border-top:1px_solid_var(--border)]" : ""}`}>
          <span className={labelClass} style={{ color: "var(--fg-faint)" }}>{box.lastChecked}</span>
          <span className="text-[15px] font-semibold" style={{ color: "var(--fg)" }}>{dated.when}</span>
          {behindNotes ? <span className={noteClass} style={{ color: "var(--fg-locked)" }}>{behindNotes}</span> : null}
        </div>
      </div>
      {/* The 44px is the ROW's height, never the link's box: the link stays inline text with a full-height target. */}
      {!store.cart && shoppingCards.length > 0 ? (
        <DeckBoxFoot>
          <p data-no-cart="" className="m-0 text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>
            {storeCopy.noCart(store)}
          </p>
          <StorePasteRow store={store} lines={shoppingCards} />
        </DeckBoxFoot>
      ) : null}
      {buyHref ? (
        <DeckBoxFoot className="!gap-0 !py-0">
          <div className="flex min-h-[44px] items-center">
            <ExternalLink href={buyHref} label={exportLinkOutCopy.shopping} />
          </div>
          {/* What the link sends, said once: cards by name and quantity, tokens by set and number. */}
          {tokens ? (
            <p className="m-0 pb-[10px] font-mono text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
              {tokensCopy.strip.sends(shoppingCards.length, tokens.lines.length)}
            </p>
          ) : null}
        </DeckBoxFoot>
      ) : null}
    </DeckBox>
  );
}
