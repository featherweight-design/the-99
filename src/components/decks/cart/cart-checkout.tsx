// CartCheckout — the cart's total and its way out to Mana Pool (handoff K2, K3, T1, T2, A4). The
// box is PriceStrip's, copied rather than mounted: PriceStrip draws nothing on a failed price read,
// and the cart keeps its link then (T2), because the link carries names and quantities only.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { exportLinkOutCopy } from "../../../lib/copy/decks-builder";
import { priceCopy } from "../../../lib/copy/price";
import { formatCents, type ProvenanceForm } from "../../../lib/decks/price";
import type { CartFigures } from "../../../lib/decks/cart";
import { ExternalLink } from "../../ui/external-link";

export function CartCheckout({
  total,
  deckCount,
  priced,
  provenance,
  links,
}: {
  total: CartFigures;
  /** Selected decks. Zero is A4: nothing to buy, so no figure and no link. */
  deckCount: number;
  priced: boolean;
  provenance: ProvenanceForm | null;
  links: { href: string; lineCount: number }[];
}) {
  const showFigure = priced && total.pricedCopies > 0;
  const showClause = showFigure && total.pricedCopies < total.copies;
  const first = !priced
    ? copy.checkout.unread
    : showFigure ? priceCopy.strip.provenance : priceCopy.strip.provenanceUnpriced;
  const provenanceLine = [
    first,
    ...(priced && provenance ? [priceCopy.strip.lastChecked(provenance.when)] : []),
    ...(priced && provenance?.behind ? [priceCopy.strip.behind] : []),
  ].join(" · ");
  return (
    <div
      className="flex flex-col gap-[5px] rounded-[9px] border border-[color:var(--border)] px-[13px] pt-[10px] pb-0"
      style={{ background: "var(--surface-sunken)" }}
    >
      {deckCount === 0 ? (
        // A4: the provenance line stays (STATES A4); no figure, no link, no sends.
        <>
          <p className="m-0 font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-locked)]">{provenanceLine}</p>
          <p className="m-0 pt-[4px] pb-[12px] text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">
            {copy.checkout.noneSelected}
          </p>
        </>
      ) : (
        <>
          {showFigure ? (
            <p className="m-0 flex flex-wrap items-baseline gap-x-[7px] font-mono">
              <span className="text-[14px] font-semibold text-[color:var(--fg)]">{formatCents(total.cents)}</span>
              {showClause ? (
                <span className="text-[10.5px] text-[color:var(--fg-faint)]">
                  <span aria-hidden="true">{"· "}</span>
                  {priceCopy.strip.pricedClause(total.pricedCopies, total.copies)}
                </span>
              ) : null}
            </p>
          ) : null}
          <p className="m-0 text-[12.5px] text-[color:var(--fg-body)]">
            {copy.checkout.copiesLine(total.copies, deckCount)}
          </p>
          <div>
            <p className="m-0 font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-locked)]">{provenanceLine}</p>
            {links.map((link, i) => (
              // K3: one row per part, the part inside the link's own label, so each of several links
              // has a name of its own rather than five that all read `Buy these at Mana Pool`.
              <div key={link.href} className="mt-[4px] flex min-h-[44px] items-center">
                <ExternalLink
                  href={link.href}
                  label={links.length > 1
                    ? `${exportLinkOutCopy.shopping} · ${copy.checkout.part(i + 1, links.length, link.lineCount)}`
                    : exportLinkOutCopy.shopping}
                />
              </div>
            ))}
            <p className="m-0 pb-[12px] text-[11.5px] leading-[1.5] text-[color:var(--fg-faint)]">
              {copy.checkout.sends(links.reduce((n, l) => n + l.lineCount, 0))}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
