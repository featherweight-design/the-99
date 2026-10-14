"use client";

// The receipt of a precon start whose DECK failed to start after the add ("I own this precon"): the Start dialog
// becomes this, drawn from the shared `AddedReceipt`, with Undo through the same revert History draws. When the
// start succeeds there is no receipt: the deck page's arrival band says the cards were added and links History.
// `StripAddedParam` spends the one-time `?added=` claim on the deck page, drawn or not.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PRECON_ADDED_PARAM } from "../../../lib/decks/arrival";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import { gotItCopy } from "../../../lib/copy/i-got-it";
import { preconsCopy } from "../../../lib/copy/precons";
import { mirrorUrl } from "../../../lib/url/mirror";
import type { PreconAddReceipt } from "../../../lib/precons/add-receipt-read";
import { AddedReceipt, type WentInputs } from "../../collection/added-receipt";
import { RevertConfirm } from "../../collection/revert-confirm";
import { ArrivalBandShell } from "../arrival-strip";

const add = collectionEditCopy.add;
const copy = preconsCopy.arrival.receipt;

/** Takes `?added=` off the address: a one-time claim is spent once the page has seen it, whether or not it drew anything. */
export function useStripAddedParam(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PRECON_ADDED_PARAM)) return;
    url.searchParams.delete(PRECON_ADDED_PARAM);
    mirrorUrl(url);
  }, [on]);
}

/** Mounted when `?added=` was supplied and no receipt could be drawn for it (a stale, foreign or failed claim): it only spends the claim. */
export function StripAddedParam() {
  useStripAddedParam(true);
  return null;
}

export function PreconAddedReceipt({ receipt, went = null, note, onClose, onReverted }: {
  receipt: PreconAddReceipt;
  /** Where each copy went, when the add's own response is at hand (the dialog's fallback); the ledger read has none. */
  went?: WentInputs | null;
  /** A line above the receipt (the dialog's "deck did not start"). */
  note?: string;
  /** The receipt was dismissed or undone. */
  onClose?: () => void;
  /** The add was UNDONE (not merely dismissed): whatever remembered it as made must forget it. */
  onReverted?: () => void;
}) {
  const router = useRouter();
  const [gone, setGone] = useState(false);
  const [undoing, setUndoing] = useState(false);

  if (gone) return null;
  const dismiss = () => { setGone(true); onClose?.(); };
  const extra = (
    <>
      {receipt.foil > 0 ? <p className="m-0 font-mono text-[12px] text-[color:var(--fg-faint)]">{copy.foil(receipt.foil)}</p> : null}
      {receipt.tokens.marked > 0 ? <p className="m-0 font-mono text-[12px] text-[color:var(--fg-faint)]">{copy.tokens(receipt.tokens.marked)}</p> : null}
    </>
  );
  return (
    <>
      <ArrivalBandShell align="start">
        <div className="flex min-w-0 flex-1 flex-col pr-[40px]">
          {note ? <p role="alert" className="m-0 pt-[6px] text-[13px] text-[color:var(--fg-body)]">{note}</p> : null}
          <AddedReceipt
            title={add.savedTitle(receipt.copies)}
            body={add.savedBody(receipt.cards)}
            extra={extra}
            went={went}
            historyHref={`/collection/history?entry=${receipt.entryId}`}
            historyLabel={add.seeInHistory}
          >
            <button
              type="button"
              onClick={() => setUndoing(true)}
              className="min-h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] text-[14px] text-[color:var(--fg)] md:min-h-[38px]"
            >
              {gotItCopy.receipt.undo}
            </button>
          </AddedReceipt>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={copy.dismissAria}
          className="absolute right-[4px] top-[2px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-muted)] transition-colors md:right-[22px] md:top-[4px] md:hover:text-[color:var(--accent)]"
        >
          ✕
        </button>
      </ArrivalBandShell>
      {undoing && (
        <RevertConfirm
          entryId={receipt.entryId}
          title={collectionEditCopy.history.addedFromPrecon(receipt.name)}
          when={collectionEditCopy.copies.undoWhen}
          onClose={() => setUndoing(false)}
          onReverted={() => { setUndoing(false); setGone(true); onReverted?.(); onClose?.(); router.refresh(); }}
        />
      )}
    </>
  );
}
