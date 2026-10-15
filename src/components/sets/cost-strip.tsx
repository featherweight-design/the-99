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

import { useRef, useState } from "react";
import { formatCents } from "../../lib/decks/price";
import { setPageCopy } from "../../lib/copy/set-collections";
import type { CostToComplete } from "../../lib/sets/cost";
import { Chevron } from "../ui/chevron";

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
  // R3 finding 6, move 3. The phone form is ONE 44px row that expands in place; the
  // desktop form is the card below, unchanged and always open.
  //
  // The caveat count is why truncating was not enough. This strip's height is the number
  // of pricing facts that happen to be true — up to four lines of them — so a head
  // containing it has a height nobody can predict, which is the ghost-Clear defect §28
  // already ruled out on the row below.
  const [expanded, setExpanded] = useState(false);
  /**
   * Which toggle to focus after the swap. Each of the two unmounts the other, so without
   * this a keyboard reader who opens the strip — or closes it again — is left on the body
   * rather than on the control that now represents the same disclosure.
   *
   * A ref rather than an effect on `expanded`: the very first render must not steal focus
   * from wherever the reader actually is.
   */
  const focusToggle = useRef(false);
  const takeFocus = (node: HTMLButtonElement | null) => {
    if (node !== null && focusToggle.current) {
      focusToggle.current = false;
      node.focus();
    }
  };

  // Three cases, and only the middle one is "no price". Nothing missing is a real zero.
  // Missing cards that cannot be costed is unavailable pricing, and $0.00 there would read
  // as a set that costs nothing to finish.
  const sending = sendCount ?? cost.missingCount;
  const total = cost.missingCount === 0
    ? formatCents(0)
    : cost.pricedCount === 0
      ? setPageCopy.cost.noneCostable
      : formatCents(cost.totalCents);

  const caveats = [
    cost.absentCount > 0,
    cost.inconclusiveCount > 0,
    cost.soldOutCount > 0,
    staleAsOf !== null,
  ].filter(Boolean).length;

  return (
    <div
      data-set-cost
      className="relative rounded-[10px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      {/* The phone's collapsed row. `md:hidden` and unmounted above it rather than styled
          away, because it is a BUTTON: left in the tree at desktop it would be a second
          control with the same job, reachable by keyboard and invisible. */}
      {!expanded ? (
        <button
          type="button"
          ref={takeFocus}
          data-set-cost-toggle
          onClick={() => {
            focusToggle.current = true;
            setExpanded(true);
          }}
          aria-expanded={false}
          aria-label={setPageCopy.cost.expandAria(
            `${total} ${(scope === "extras"
              ? setPageCopy.cost.collapsedTailExtras
              : setPageCopy.cost.collapsedTail)(cost.pricedCount, cost.missingCount)}`,
            caveats,
            href !== null,
          )}
          className="flex h-[44px] w-full items-center gap-[8px] px-[12px] text-left md:hidden"
        >
          <span className="flex min-w-0 flex-1 items-baseline gap-[6px] font-mono text-[12px]">
            <span className="shrink-0" style={{ color: "var(--accent)" }}>{total}</span>
            <span className="min-w-0 truncate" style={{ color: "var(--fg-body)" }}>
              {(scope === "extras"
                ? setPageCopy.cost.collapsedTailExtras
                : setPageCopy.cost.collapsedTail)(cost.pricedCount, cost.missingCount)}
            </span>
          </span>
          {/* The caveats are not dropped, they are counted. A row that silently omitted
              "3 have never been stocked" would be a figure the reader cannot audit. */}
          {caveats > 0 ? (
            <span className="shrink-0 font-mono text-[10px]" style={{ color: "var(--fg-muted)" }}>
              {caveats}
            </span>
          ) : null}
          {/* The app's chevron size (H15 raised it from 11px, where it read as punctuation; bug
              batch 2026-10-12 set every chevron to one size, 13px). */}
          <Chevron kind="disclosure" className="shrink-0" style={{ color: "var(--fg-muted)" }} />
        </button>
      ) : null}

      {/* The full form. Always mounted at desktop; on the phone it replaces the row above
          on tap, in place. */}
      <div
        className={`${expanded ? "flex" : "hidden"} md:flex flex-wrap items-center
                    gap-x-[14px] gap-y-[8px] py-[10px] pl-[12px] pr-[44px] md:pr-[12px]`}
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
        // Left-aligned on the phone (H15), where it wraps onto its own line and a
        // right-pinned button sat apart from everything it acts on; right from `md`.
        className="md:ml-auto inline-flex min-h-[44px] md:min-h-[32px] items-center rounded-[8px]
                   px-[14px] text-[13px] bg-[color:var(--fg)] text-[color:var(--bg)]
                   hover:opacity-90 transition-opacity"
      >
        {sendCapped ? setPageCopy.cost.sendCapped(sending) : setPageCopy.cost.send(sending)}
      </a>
      ) : null}
      {href && sendCapped ? (
        <span
          data-set-cost-cap
          className="basis-full font-mono text-[10px]"
          style={{ color: "var(--fg-locked)" }}
        >
          {setPageCopy.cost.capNote(sending)}
        </span>
      ) : null}

      {/* The way back, phone only — the desktop form has never been closable and does not
          become so. Rendered inside the expanded block so it leaves with it. */}
      {expanded ? (
        <button
          type="button"
          ref={takeFocus}
          data-set-cost-toggle
          onClick={() => {
            focusToggle.current = true;
            setExpanded(false);
          }}
          aria-expanded
          aria-label={setPageCopy.cost.collapseAria}
          // Pinned where the collapsed row's chevron was (H15): it used to wrap to a full-width
          // row at the strip's foot, so the control that opened the strip moved the moment
          // it was pressed. The block above reserves its 44px.
          // The glyph sits at the chevron's own x, not centred in the 44px target: it ends at the
          // collapsed row's 12px padding, so the open chevron ends there too.
          className="absolute right-0 top-0 flex h-[44px] w-[44px] items-center justify-end pr-[12px]
                     font-mono text-[color:var(--fg-muted)] md:hidden"
        >
          <Chevron kind="disclosure" open />
        </button>
      ) : null}
      </div>
    </div>
  );
}
