// CartCheckout — the cart's total and its way out to Mana Pool (handoff K2, K3, T1, T2, A4). The
// box is PriceStrip's, copied rather than mounted: PriceStrip draws nothing on a failed price read,
// and the cart keeps its link then (T2), because the link carries names and quantities only.

import { CopyLines } from "../../copy-lines";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { exportLinkOutCopy } from "../../../lib/copy/decks-builder";
import { priceCopy } from "../../../lib/copy/price";
import { formatCents, type ProvenanceForm } from "../../../lib/decks/price";
import type { CartFigures } from "../../../lib/decks/cart";
import { ExternalLink } from "../../ui/external-link";
import { storeCopy } from "../../../lib/copy/store";
import { StoreDoor } from "../../stores/store-door";
import { StorePasteRow } from "../../stores/store-paste-row";
import { useStoreInfo } from "../../stores/store-provider";

export function CartCheckout({
  total,
  deckCount,
  priced,
  provenance,
  links,
  pasteLines = [],
}: {
  total: CartFigures;
  /** Selected decks. Zero is A4: nothing to buy, so no figure and no link. */
  deckCount: number;
  priced: boolean;
  provenance: ProvenanceForm | null;
  links: { href: string; lineCount: number }[];
  /** The selection as `1 Name` lines, for a store with no cart link (store choice, call 6). Empty on Mana Pool. */
  pasteLines?: readonly { name: string; quantity: number }[];
}) {
  const store = useStoreInfo();
  // Whether ManaPool priced anything and whether the sum is worth drawing are two questions: a
  // live copy at $0.00 is priced, and draws no figure (as the tile draws none for a zero total).
  const anyPriced = priced && total.pricedCopies > 0;
  const showFigure = anyPriced && total.cents > 0;
  const showClause = showFigure && total.pricedCopies < total.copies;
  const first = !priced
    ? copy.checkout.unread
    : anyPriced ? storeCopy.provenance(store) : storeCopy.provenanceUnpriced(store);
  const provenanceLines = [
    first,
    // A market figure is an average of sales, said beside the figure it qualifies (call 4).
    ...(anyPriced && store.figure === "market" ? [storeCopy.marketNote] : []),
    ...(priced && provenance ? [priceCopy.strip.lastChecked(provenance.when)] : []),
    ...(priced && provenance?.behind ? [priceCopy.strip.behind] : []),
  ];
  const provenanceLine = <CopyLines lines={provenanceLines} sep=" · " />;
  return (
    <div
      // About's label 1 on the cart's capture is boxed on this (`scripts/lib/about-locators.mjs`).
      data-cart-checkout
      className="flex flex-col gap-[5px] rounded-[9px] border border-[color:var(--border)] px-[13px] pt-[10px] pb-0"
      style={{ background: "var(--surface-sunken)" }}
    >
      {deckCount === 0 ? (
        // A4: the provenance line stays (STATES A4); no figure, no link, no sends.
        <>
          <p className="m-0 font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-locked)]">{provenanceLine}<StoreDoor /></p>
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
            <p className="m-0 font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-locked)]">{provenanceLine}<StoreDoor /></p>
            {!store.cart ? (
              // No whole-list link (call 6): the line says so, then the paste row; no sends line, since nothing is sent.
              <>
                <p data-no-cart="" className={`m-0 mt-[6px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] ${store.paste && pasteLines.length > 0 ? "" : "pb-[12px]"}`}>
                  {storeCopy.noCart(store)}
                </p>
                {store.paste && pasteLines.length > 0 ? <div className="pb-[6px]"><StorePasteRow store={store} lines={pasteLines} /></div> : null}
              </>
            ) : null}
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
            {store.cart ? (
              <p className="m-0 pb-[12px] text-[11.5px] leading-[1.5] text-[color:var(--fg-faint)]">
                {copy.checkout.sends(links.reduce((n, l) => n + l.lineCount, 0))}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
