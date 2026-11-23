// The store line under a result's four facts (store label, addendum-upgrade-store): the deck Shopping strip's provenance line, worded
// from the same copy, for the adds this run's To buy figure counts. It names `priceStore`, the store the panel's figures were read at, and
// never the reader's preference; a panel that drew stored figures (switch off, read failed) has none and draws no line.
import { priceCopy } from "../../../../lib/copy/price";
import { storeCopy } from "../../../../lib/copy/store";
import { STORE_INFO } from "../../../../lib/stores/info";
import type { ProvenanceForm } from "../../../../lib/cards/price-fact";
import type { Store } from "../../../../lib/stores/rows";

/** The line's words, in the strip's order: store, market note (only beside a figure), the priced clause, when, behind. */
export function upgradePriceLineText(store: Store, toBuy: { cards: number; priced: number }, dated: ProvenanceForm): string {
  const info = STORE_INFO[store];
  const any = toBuy.priced > 0;
  return [
    any ? storeCopy.provenance(info) : storeCopy.provenanceUnpriced(info),
    ...(any && info.figure === "market" ? [storeCopy.marketNote] : []),
    ...(any && toBuy.priced < toBuy.cards ? [priceCopy.strip.pricedClause(toBuy.priced, toBuy.cards)] : []),
    priceCopy.strip.lastChecked(dated.when),
    ...(dated.behind ? [priceCopy.strip.behind] : []),
  ].join(" · ");
}

export function UpgradePriceLine({ store, toBuy, dated }: { store: Store | null; toBuy: { cards: number; priced: number }; dated: ProvenanceForm }) {
  // Nothing to buy has nothing to date, and no store means the figures are the run's stored ones.
  if (!store || toBuy.cards === 0) return null;
  return (
    // 3px in from the facts' edge so it reads as theirs. `--fg-faint`, not the strip's `--fg-locked`: locked measures 3.2:1 to 3.4:1
    // on every theme's ground at 9.5px, and this line names the store the figures are from, so it has to be read (faint: 5.2:1 or better).
    <p data-upgrade-price-line="" className="m-0 pl-[3px] font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-faint)]">
      {upgradePriceLineText(store, toBuy, dated)}
    </p>
  );
}
