"use client";

import { useState } from "react";

import { publicPagesCopy } from "../../lib/copy/public-pages";
import { scryfallPrintingUrl, scryfallPrintsUrl } from "./links";

const c = publicPagesCopy.card;

/** How many chips the phone shows before `Show all N` (A3 390). From `md` every chip shows. */
export const PHONE_PRINTINGS = 8;

const CHIP = "inline-flex items-center h-[36px] md:h-[32px] px-[11px] rounded-[7px] font-mono text-[12px] no-underline";
const FOLDED = "max-md:hidden";

type Printing = { setCode: string; collectorNumber: string };

const code = (p: Printing) => `${p.setCode.toUpperCase()} ${p.collectorNumber}`;

/**
 * The printings chips (A1 to A4). Each opens that printing on Scryfall. The read orders the card's own printing (its
 * `scryfall_id`, the catalog's main printing) first; when it is there (`marked`) that chip carries ◇: the one pictured, or,
 * with no image, the catalog's main printing. When it is not, no chip is marked and no note claims one. The phone shows 8 behind
 * a 44px `Show all N`; from `md` all of them show. At the read's cap the count says `first 40` and the chips end in
 * `More on Scryfall ↗`.
 */
export function PublicPrintings({
  name,
  printings,
  capped,
  marked,
  pictured,
}: {
  name: string;
  printings: Printing[];
  /** The read returned exactly its limit, so there may be more than these. */
  capped: boolean;
  /**
   * Whether the first printing is the one the card box pictures. When it is not (no image, or an image the catalog holds
   * no printing row for), ◇ marks the catalog's main printing and the note says so.
   */
  pictured: boolean;
  /** The first chip is the card's own printing, so it may carry ◇. */
  marked: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (printings.length === 0) return null;
  const folds = !open && printings.length > PHONE_PRINTINGS;
  return (
    <section aria-label={c.printings} data-testid="public-printings" className="mt-[28px] md:mt-[32px]">
      <div className="flex items-baseline gap-[10px]">
        <h2 className="m-0 font-mono font-normal text-[10.5px] tracking-[0.14em] uppercase text-[color:var(--fg-faint)]">{c.printings}</h2>
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{capped ? c.printingsCapped : printings.length}</span>
      </div>
      <div className="mt-[12px] flex flex-wrap gap-[8px]">
        {printings.map((p, i) => {
          const shown = marked && i === 0;
          return (
            <a
              key={`${p.setCode}-${p.collectorNumber}`}
              href={scryfallPrintingUrl(p.setCode, p.collectorNumber)}
              target="_blank"
              rel="noopener"
              aria-label={shown && pictured ? c.printingShownLabel(code(p)) : undefined}
              data-testid="public-printing"
              className={`${CHIP} ${
                shown
                  ? "gap-[6px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--fg)]"
                  : "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg-body)]"
              } ${folds && i >= PHONE_PRINTINGS ? FOLDED : ""}`}
            >
              {shown ? <span aria-hidden="true" className="text-[color:var(--fg-faint)]">◇</span> : null}
              {code(p)}
            </a>
          );
        })}
        {capped ? (
          <a
            href={scryfallPrintsUrl(name)}
            target="_blank"
            rel="noopener"
            data-testid="public-printings-more"
            className={`inline-flex items-center gap-[5px] h-[36px] md:h-[32px] px-[12px] rounded-[7px] border border-dashed border-[color:var(--border-dashed)] text-[12.5px] font-medium text-[color:var(--accent-hover)] no-underline ${folds ? FOLDED : ""}`}
          >
            {c.morePrintings}
            <span aria-hidden="true" className="text-[0.85em] text-[color:var(--fg-muted)]">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
      {folds ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="public-printings-show-all"
          className="md:hidden mt-[12px] w-full min-h-[44px] rounded-[8px] border border-dashed border-[color:var(--border-strong)] bg-transparent font-mono text-[12px] text-[color:var(--accent-text)] cursor-pointer"
        >
          {capped ? c.showAllCapped : c.showAll(printings.length)}
        </button>
      ) : null}
      {marked ? (
        <p className="m-0 mt-[10px] font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)]">
          {pictured ? c.printingsNote : c.printingsNoteNoImage}
        </p>
      ) : null}
    </section>
  );
}
