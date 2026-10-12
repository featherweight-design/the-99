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
import { MOTION, prefersReducedMotion } from "../../lib/ui/motion";
import { reveal } from "../../lib/ui/reveal";
import { MutationError } from "./mutation-error";

const copy = swapToolsCopy.row;

/**
 * Put focus on a take's receipt, where Undo swap lives, and bring it into view (addendum §3). Both doors
 * close onto it: the row that opened the sheet or the card leaves the list with its last copy, so the
 * dialog's own focus return has nowhere to go. The receipt draws once per mounted view, so the visible
 * copy is the one taken.
 *
 * It HOLDS for up to three seconds rather than landing once, and that is measured, not caution: a sheet
 * closed quickly after a take lands on the receipt the page draws at once, and then the revalidated page
 * arrives and draws it again as a NEW node in the cut row's slot. Focus falls to the body with the old
 * node, and the new one sat 2,000px below the viewport; and the page scrolled back under a receipt
 * already focused as the list landed. So each frame it lands again when focus has fallen to the body,
 * and brings the receipt back when it has left the viewport. It stops at the reader's first wheel,
 * touch, key or press, and when focus moves anywhere else.
 */
export function landOnReceipt(swapId: string): () => void {
  let frame = 0;
  let landed = false;
  let stopped = false;
  let frames = 0;
  // One eased reveal per receipt node at a time: asked again every frame, it would restart its beat
  // and never move. A new node (the revalidated page's), or one that ran out, is revealed afresh.
  let revealed: Element | null = null;
  let revealEnds = 0;
  let cancelReveal = () => {};
  const until = performance.now() + 3000;
  // The reader's own input ends the hold at once: nothing here may fight a scroll or a keypress.
  const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    for (const e of inputs) window.removeEventListener(e, stop, true);
  };
  for (const e of inputs) window.addEventListener(e, stop, true);
  const land = () => {
    if (stopped) return;
    if (performance.now() > until) return stop();
    frames += 1;
    // A card still open (paging, a combo partner, the card the sheet was stacked over) keeps focus. One
    // that is closing is still in the document for a frame or two, so it is waited out that long.
    if (document.querySelector('[role="dialog"][aria-labelledby^="card-modal-title"]')) {
      if (frames > 10) return stop();
      frame = requestAnimationFrame(land);
      return;
    }
    const receipt = [...document.querySelectorAll<HTMLElement>(`[data-swap-id="${CSS.escape(swapId)}"]`)]
      .find((el) => el.getClientRects().length > 0);
    const button = receipt?.querySelector<HTMLButtonElement>("button");
    const active = document.activeElement;
    // The reader has gone somewhere of their own: leave them there.
    if (landed && active && active !== document.body && !receipt?.contains(active)) {
      cancelReveal();
      return stop();
    }
    // The sheet that is closing is still in the document the frame after its unmount began; a list
    // still re-rendering has no receipt yet. Both are waited out.
    if (receipt && button && !document.querySelector('[role="dialog"]')) {
      if (!receipt.contains(active)) button.focus({ preventScroll: true });
      const box = receipt.getBoundingClientRect();
      // Out of view, it is brought back: the page moves under it as the revalidated list lands.
      const now = performance.now();
      if ((!landed || box.top < 0 || box.bottom > window.innerHeight) && (receipt !== revealed || now > revealEnds)) {
        revealed = receipt;
        // Reduced motion jumps at once, so there is nothing in flight to wait out.
        revealEnds = prefersReducedMotion() ? now : now + MOTION.delayMs + MOTION.scrollMaxMs;
        cancelReveal = reveal(receipt, "center");
      }
      landed = true;
    }
    frame = requestAnimationFrame(land);
  };
  frame = requestAnimationFrame(land);
  return stop;
}

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
    <div data-testid="swap-receipt" data-swap-id={receipt.swapId}>
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
