"use client";
// /credits (buying credits, U1): the head, the Checkout return band, the balance, the pack offers, the purchase
// history and the refund line. The server reads and decides (`buildCreditsModel`); this draws, and holds the two
// bits of state a press changes: the toast, and whether the offers are still on sale (a Buy press the server
// answers as `off` takes the section away, so no dead press is left behind).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditsHead, PAGE } from "./credits-head";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import type { CreditsModel } from "../../lib/payments/page-model";
import type { ReturnRead } from "../../lib/payments/return-rule";
import { Balance } from "./balance";
import { CreditsToast, type CreditsToastState } from "./credits-toast";
import { History } from "./history";
import { PackOffers, type BuyFailure } from "./pack-offers";
import { CancelledBand, ReturnBand, type BandTiming } from "./return-band";

const c = creditsPageCopy;

/** How the reader came back from Checkout: closed on Stripe's page, or finished (with the Session to follow). */
export type ReturnProp = { kind: "cancelled" } | { kind: "done"; sessionId: string; initial: ReturnRead | null };

export function CreditsView({ model, ret, timing }: { model: CreditsModel; ret: ReturnProp | null; timing?: BandTiming }) {
  const router = useRouter();
  const [toast, setToast] = useState<CreditsToastState | null>(null);
  const [onSale, setOnSale] = useState(true);
  const [added, setAdded] = useState<number | null>(ret?.kind === "done" && ret.initial?.kind === "added" ? ret.initial.units : null);
  const say = (text: string, detail?: string) => setToast((t) => ({ id: (t?.id ?? 0) + 1, text, detail }));

  function buyFailed(reason: BuyFailure) {
    say(c.buy[reason]);
    // Payments went off for this reader: the offer is gone rather than left as a press that cannot work.
    if (reason === "off") setOnSale(false);
  }

  return (
    <div className={PAGE}>
      <CreditsHead />
      {ret?.kind === "cancelled" ? <CancelledBand /> : null}
      {ret?.kind === "done" ? (
        <ReturnBand
          sessionId={ret.sessionId}
          initial={ret.initial}
          timing={timing}
          onAdded={(units) => {
            setAdded(units);
            // The cells are the server's: re-read them, so the total and the Packs cell carry what landed.
            router.refresh();
          }}
          onReadFailed={() => say(c.ret.toast, c.ret.toastDetail)}
          onReceiptFailed={() => say(c.hist.receiptFailed)}
        />
      ) : null}
      <Balance total={model.total} cells={model.cells} freeLimit={model.freeLimit} nextAtMs={model.nextAtMs} added={added} />
      {model.offers && onSale ? <PackOffers offers={model.offers} onFailure={buyFailed} /> : null}
      <History items={model.history} onReceiptFailed={() => say(c.hist.receiptFailed)} />
      <CreditsToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
