"use client";

/**
 * What a take leaves on the Shopping list (swap tools, PR 4b): `Plateau → Rugged Prairie`, or
 * `…, your free copy`, or `one copy → Rugged Prairie` under a row that keeps copies. UndoRow's shell,
 * with `Undo swap` (H2) as its action. A refused undo says so under it (F4), and the receipt stays.
 */
import { useState } from "react";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { undoSwapAction } from "../../lib/swaps/actions";
import { useSwapTools, type SwapReceipt } from "../../lib/swaps/context";
import { MutationError } from "./mutation-error";

const copy = swapToolsCopy.row;

export function SwapReceiptRow({ receipt }: { receipt: SwapReceipt }) {
  const tools = useSwapTools();
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);
  if (!tools) return null;

  const text =
    receipt.cutLeft > 0 ? copy.receiptOneCopy(receipt.add)
    : receipt.free ? copy.receiptFree(receipt.cut, receipt.add)
    : copy.receipt(receipt.cut, receipt.add);

  const undo = async () => {
    setBusy(true);
    setRefused(false);
    try {
      const { ok } = await undoSwapAction(receipt.swapId);
      if (ok) {
        tools.announce(swapToolsCopy.announce.undone(receipt.cut, receipt.add));
        tools.dropReceipt(receipt.swapId);
      } else {
        setRefused(true);
      }
    } catch {
      setRefused(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="swap-receipt">
      <div
        className="flex items-center gap-[9px] md:gap-[10px] min-h-[44px] md:min-h-[34px] pl-[8px] pr-[4px] md:px-[9px] md:py-[7px] rounded-[7px] border border-dashed border-[color:var(--border-strong)]"
        style={{ background: "var(--surface-sunken)" }}
      >
        <span aria-hidden="true" className="flex-none w-[8px] h-[8px]" />
        {/* A label on a bare span is discarded, so the sentence is spoken in its place. */}
        <span
          aria-hidden="true"
          className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11.5px]"
          style={{ color: "var(--fg-locked)" }}
        >
          {text}
        </span>
        <span className="sr-only">{copy.receiptAria(receipt.cut, receipt.add)}</span>
        <button
          type="button"
          onClick={() => void undo()}
          disabled={busy}
          aria-label={copy.undoSwapAria(receipt.cut, receipt.add)}
          className="flex-none flex items-center h-[44px] px-[12px] text-[13px] md:inline md:h-auto md:px-0 md:text-[12.5px] md:leading-[1.4] md:[border-bottom:1px_solid_var(--accent-shadow)] font-semibold bg-transparent border-0 cursor-pointer disabled:opacity-50 text-[color:var(--accent)]"
        >
          {copy.undoSwap}
        </button>
      </div>
      {refused ? <MutationError message={swapToolsCopy.sheet.undoRefused} /> : null}
    </div>
  );
}
