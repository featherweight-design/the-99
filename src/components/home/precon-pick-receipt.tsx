"use client";

// The receipt after a precon pick (no-collection entry S5): the arrival strip's anatomy (the rail's band, a `--success`
// ✓, the ✕ alone), naming the decks the boxes started, their cards and tokens, and History. Its dismissal is its own (no deck to key on),
// and the `?precons=` claim is spent once seen: the receipt is held for the visit, so the strip stays while the
// address no longer names it.

import Link from "next/link";
import { useEffect, useState } from "react";
import { preconsCopy } from "../../lib/copy/precons";
import { PICK_RECEIPT_PARAM, pickReceiptDismissKey } from "../../lib/precons/pick";
import type { PickReceipt } from "../../lib/precons/pick-receipt-read";
import { mirrorUrl } from "../../lib/url/mirror";
import { ArrivalBandShell, ArrivalDismiss } from "../decks/arrival-strip";
import { useLocalFlag } from "../decks/use-local-flag";
import { PendingReporter } from "../shell/pending-reporter";

const copy = preconsCopy.pick.receipt;

export function PreconPickReceipt({ receipt }: { receipt: PickReceipt }) {
  const [held] = useState(receipt);
  const [dismissed, dismiss] = useLocalFlag(pickReceiptDismissKey(held.entryIds));
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PICK_RECEIPT_PARAM)) return;
    url.searchParams.delete(PICK_RECEIPT_PARAM);
    mirrorUrl(url);
  }, []);
  if (dismissed) return null;
  const href = held.entryIds.length === 1 ? `/collection/history?entry=${held.entryIds[0]}` : "/collection/history";
  const history = (
    <Link href={href} prefetch={false} className="-my-[11px] inline-block py-[11px] text-[color:var(--accent-text)] underline underline-offset-2">
      {copy.history}
      <PendingReporter href={href} />
    </Link>
  );
  return (
    <div role="status">
      <ArrivalBandShell>
        <span aria-hidden className="text-[12px] leading-none md:text-[14px]" style={{ color: "var(--success)" }}>✓</span>
        <p className="m-0 flex-1 text-[color:var(--fg-body)]">
          <span className="font-mono text-[10.5px] md:hidden">{copy.phone(held.entryIds.length, held.copies, held.decks)} · {history}</span>
          <span className="hidden text-[13.5px] md:inline">
            <b className="font-semibold text-[color:var(--fg)]">{copy.head(held.entryIds.length, held.decks)}</b>{" "}
            {copy.body(held.names, held.copies, held.tokens)} {history}
          </span>
        </p>
        <ArrivalDismiss onDismiss={dismiss} />
      </ArrivalBandShell>
    </div>
  );
}
