"use client";
// Where an added copy goes, from I got it's receipt (handoff IG5): the shipped chooser in the app's
// modal, 520 wide from `md`, and the bottom sheet on a phone. A toast cannot hold a list, so the
// receipt's Change opens this rather than unfolding in place; the toast's clock holds while it is
// open (the receipt passes it as in flight).
//
// A pick here is the chooser's own write (`assignCopy`), optimistic on the tap; `onCard` hands the
// card each write read back to the receipt, which redraws its sentence from it and remembers the
// pick its Undo has to drop.

import { useId, useMemo, useRef } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { ContestedCardRow } from "./contested-card-row";
import { GhostButton } from "../ui/button";

const c = gotItCopy.receipt;

export function CopyChooserDialog({
  card, cardName, thisDeckId, onCard, onWrite, onPending, onUnknown, onClose,
}: {
  card: ContestedCard;
  cardName: string;
  /** The deck the copy was bought for: tagged `this deck` in the chooser, never promoted. */
  thisDeckId: string;
  /** The card a write read back; null when it settled with none (the last copy went elsewhere). */
  onCard: (card: ContestedCard | null) => void;
  /** A write that landed: whether it left a pick on `deckId` (the row's `onWrite`). */
  onWrite?: (deckId: string, picked: boolean, createdAt?: string) => void;
  /** Each write as it starts and settles (the row's `onPending`). */
  onPending?: (pending: boolean) => void;
  /** A write whose outcome is unknown (the row's `onUnknown`). */
  onUnknown?: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, onClose);
  // ONE object per card: the row adopts a new card prop as a fresh server reading and drops its
  // optimistic pick, so a fresh object every render would undo a tap the moment the receipt redraws.
  const named = useMemo(() => ({ ...card, cardName }), [card, cardName]);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] md:items-center md:bg-[color-mix(in_oklab,var(--bg)_74%,transparent)]"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-[22px_22px_0_0] p-[12px_22px_26px] outline-none [border-top:1px_solid_var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,.5)] md:w-[520px] md:rounded-2xl md:p-[28px_32px] md:[border:1px_solid_var(--border-strong)] md:shadow-[0_40px_100px_rgba(0,0,0,.7)]"
        style={{ background: "var(--surface-rail)" }}
      >
        <div aria-hidden className="mx-auto mb-[16px] h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)] md:hidden" />
        <h2 id={titleId} className="m-0 font-display text-[20px] font-bold" style={{ color: "var(--fg)" }}>
          {c.changeTitle}
        </h2>
        <p className="mt-[4px] mb-[14px] text-[14px]" style={{ color: "var(--fg-body)" }}>{c.changeSub(cardName)}</p>
        <ContestedCardRow card={named} thisDeckId={thisDeckId} addedCopy onCard={onCard} onWrite={onWrite} onPending={onPending} onUnknown={onUnknown} />
        <div className="mt-[16px] flex justify-end">
          <GhostButton onClick={onClose} className="px-[18px] py-[9px] text-[13.5px]">{c.done}</GhostButton>
        </div>
      </div>
    </div>
  );
}
