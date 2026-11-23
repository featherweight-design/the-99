// Precon upgrade · store label PROPOSAL (account 1, 2026-11-23). The result's provenance line: the deck Shopping strip's own
// line (`price-strip.tsx`), in its mono 9.5 `--fg-locked`, under the four facts. It names the reader's store once for the
// whole result (the To buy figure and every add's buy tag), carries TCGplayer's market note beside a figure, counts out the
// adds the store has no figure for, and dates the figures. Null with the store switch off (`store` null) or nothing to buy.
import { storeCopy } from "../../../../lib/copy/store";
import { priceCopy } from "../../../../lib/copy/price";
import type { StoreInfo } from "../../../../lib/stores/info";
import type { ProvenanceForm } from "../../../../lib/cards/price-fact";

export function UpgradePriceLine({ store, toBuy, priced, dated }: { store: StoreInfo | null; toBuy: number; priced: number; dated: ProvenanceForm }) {
  if (!store || toBuy === 0) return null;
  const any = priced > 0;
  return (
    <p data-upgrade-prices="" className="-mt-[8px] m-0 px-[3px] font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-locked)]">
      {[
        any ? storeCopy.provenance(store) : storeCopy.provenanceUnpriced(store),
        ...(any && store.figure === "market" ? [storeCopy.marketNote] : []),
        ...(any && priced < toBuy ? [priceCopy.strip.pricedClause(priced, toBuy)] : []),
        priceCopy.strip.lastChecked(dated.when),
        ...(dated.behind ? [priceCopy.strip.behind] : []),
      ].join(" · ")}
    </p>
  );
}
