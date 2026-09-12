"use client";

// What finishing this set costs, and what the figure leaves out.
//
// THE FILTERS ARE THE SELECTOR. #330's one-selector rule is satisfied by having no
// per-cell control at all: the Send button follows the filters, so filtering to red rares
// makes it `Send 9` with the total recomputed. That is how a reader buys part of a set
// without a selection UI, and it is why there is no checkbox on 214 cells.
//
// ONE COUNT. The result line, this button's label and this sentence's denominator are
// three readings of the same filtered-cell computation, passed in rather than recomputed.

import { formatCents } from "../../lib/decks/price";
import { setPageCopy } from "../../lib/copy/set-collections";
import type { CostToComplete } from "../../lib/sets/cost";

export function CostStrip({
  cost,
  href,
  sendCount,
  sendCapped = false,
  scope = "base",
  staleAsOf = null,
}: {
  cost: CostToComplete;
  /**
   * The Mass Entry link over exactly the cells the filters left, or null when the filters
   * left none. The strip still renders in that case — the handoff draws a zero figure
   * rather than a strip that disappears — and the send action is what drops out.
   */
  href: string | null;
  /** How many cards the link actually carries, which the URL's size can cap below the total. */
  sendCount?: number;
  /** True when the cap bit, so the button says what it is sending rather than implying all. */
  sendCapped?: boolean;
  /** At 100% the same strip re-scopes to the extras rather than becoming a new control. */
  scope?: "base" | "extras";
  /** Set only when the feed itself trails. Staleness is a page fact, not a cell fact. */
  staleAsOf?: string | null;
}) {

  // Three cases, and only the middle one is "no price". Nothing missing is a real zero.
  // Missing cards that cannot be costed is unavailable pricing, and $0.00 there would read
  // as a set that costs nothing to finish.
  const sending = sendCount ?? cost.missingCount;
  const total = cost.missingCount === 0
    ? formatCents(0)
    : cost.pricedCount === 0
      ? setPageCopy.cost.noneCostable
      : formatCents(cost.totalCents);

  return (
    <div
      className="flex flex-wrap items-center gap-x-[14px] gap-y-[8px] rounded-[10px]
                 px-[12px] py-[10px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-mono text-[10px] tracking-[0.08em]" style={{ color: "var(--fg-faint)" }}>
          {scope === "extras" ? setPageCopy.cost.labelExtras : setPageCopy.cost.label}
        </span>
        <span className="flex flex-wrap items-baseline gap-[8px]">
          <span className="font-mono text-[19px]" style={{ color: "var(--accent)" }}>
            {total}
          </span>
          {/* The gap is in the same sentence as the figure, never a footnote. */}
          <span className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
            {scope === "extras"
              ? setPageCopy.cost.lineExtras(cost.pricedCount, cost.missingCount)
              : setPageCopy.cost.line(cost.pricedCount, cost.missingCount)}
          </span>
        </span>
        {cost.absentCount > 0 ? (
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
            {setPageCopy.cost.unpriced(cost.absentCount)}
          </span>
        ) : null}
        {cost.inconclusiveCount > 0 ? (
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
            {setPageCopy.cost.noFigure(cost.inconclusiveCount)}
          </span>
        ) : null}
        {cost.soldOutCount > 0 ? (
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
            {setPageCopy.cost.soldOut(cost.soldOutCount)}
          </span>
        ) : null}
        {staleAsOf ? (
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
            {setPageCopy.cost.stale(staleAsOf)}
          </span>
        ) : null}
      </span>

      {/* The page's one filled button, and it takes bone rather than accent: accent is
          already doing `to buy` on every price tag below. Absent when there is nothing to
          send, which is not the same as a strip with no figure. */}
      {href ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        // The price is dropped when the cap bites: `total` costs every missing card and
        // the link carries only the first N, so announcing both together describes a
        // basket the reader is not getting.
        aria-label={sendCapped
          ? setPageCopy.cost.sendCappedAria(sending)
          : setPageCopy.cost.sendAria(sending, total)}
        className="ml-auto inline-flex min-h-[44px] md:min-h-[32px] items-center rounded-[8px]
                   px-[14px] text-[13px] bg-[color:var(--fg)] text-[color:var(--bg)]
                   hover:opacity-90"
      >
        {sendCapped ? setPageCopy.cost.sendCapped(sending) : setPageCopy.cost.send(sending)}
      </a>
      ) : null}
    </div>
  );
}
