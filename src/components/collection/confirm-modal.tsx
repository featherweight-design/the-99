"use client";
// Replace Flow — the calm replace confirm (first-run redesign D9; design table
// `first-run-calm-replace.md` §1). Continue on the review and this dialog's button are two
// deliberate presses, so there is no typed token, no icon and no --danger or --warning in the
// resting or pending dialog. The one red on it is the error line a failed confirm writes
// (audit correction 7). What it shows is a NOW → AFTER pair, and the button names what the
// player gets: the matched count, where it used to count what they lost.
//
// A first import skips this dialog (#1097). The one road to it with nothing to replace is a
// FAILED first import, reported in the error slot here, so that variant keeps its own title
// and buttons and draws the same pair from 0.
//
// READINESS #5: focus trap + Escape. Initial focus is on Keep current (D9).

import { useEffect, useRef } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { UploadPreview } from "../../app/collection/actions";
import { replaceCopy } from "../../lib/copy/replace";

export function ConfirmModal({
  preview,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  preview: UploadPreview;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const c = replaceCopy.confirm;
  const dialogRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const isInitialImport = preview.currentCollectionCount === 0;
  const words = isInitialImport
    ? {
        title: replaceCopy.importConfirm.title,
        body: replaceCopy.importConfirm.body(preview.matchedCardCount, preview.filename),
        bodyShort: replaceCopy.importConfirm.bodyShort(preview.matchedCardCount, preview.filename),
        keep: replaceCopy.importConfirm.keep,
        confirm: replaceCopy.importConfirm.confirm(preview.matchedCardCount),
        pending: replaceCopy.importConfirm.importing,
      }
    : {
        title: c.title,
        body: c.body,
        bodyShort: c.bodyShort,
        keep: c.keep,
        confirm: c.replace(preview.matchedCardCount),
        pending: c.replacing,
      };

  // Focus trap, Escape, focus-return. Escape is refused while pending: the write is already
  // running, and dismissing would only hide it. The backdrop is guarded the same way below.
  // While pending both buttons disable, and the dialog itself holds focus (tabIndex -1).
  useDialogA11y(dialogRef, onClose, {
    initialFocusRef: keepRef,
    closeOnEscape: !pending,
  });
  // Pressing Replace disables the button that has focus, which would drop focus to the body and
  // let Tab leave the dialog for the length of the write; the dialog takes it instead.
  useEffect(() => {
    if (pending) dialogRef.current?.focus();
  }, [pending]);

  return (
    // §1.1 Scrim, mixed against the canvas so the dim tracks the theme
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] md:bg-[color-mix(in_oklab,var(--bg)_74%,transparent)]"
      role="presentation"
      onClick={() => { if (!pending) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-busy={pending || undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        // §1.2 — phone: bottom sheet, 12/22/30/22, radius 22 22 0 0, top border only.
        // Desktop: 520 modal, 30/34, radius 16, border all round.
        className="w-full md:w-[520px] rounded-[22px_22px_0_0] md:rounded-2xl p-[12px_22px_30px] md:p-[30px_34px] [border-top:1px_solid_var(--border-strong)] md:[border:1px_solid_var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,.5)] md:shadow-[0_40px_100px_rgba(0,0,0,.7)] outline-none"
        style={{ background: "var(--surface-rail)" }}
      >
        {/* §1.3 Sheet handle, decorative */}
        <div aria-hidden className="md:hidden mx-auto mb-[18px] h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)]" />

        {/* §1.4 Title */}
        <h2
          id="confirm-title"
          className="m-0 font-display font-bold text-[20px] md:text-[25px] leading-[1.15] text-[color:var(--fg)]"
        >
          {words.title}
        </h2>

        {/* §1.5–1.9 The NOW → AFTER pair */}
        <div className="mt-[16px] md:mt-[18px] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[12px] md:gap-[14px] rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[12px_14px] md:p-[14px_16px]">
          <Figure
            label={c.now}
            value={c.figure(preview.currentCollectionCount)}
            caption={c.nowCaption(preview.currentCollectionCount)}
            captionShort={c.nowCaptionShort(preview.currentCollectionCount)}
          />
          <span aria-hidden className="font-mono text-[14px] md:text-[15px] text-[color:var(--fg-faint)]">→</span>
          <Figure
            label={c.after}
            value={c.figure(preview.matchedCardCount)}
            caption={c.afterCaption(preview.matchedCardCount, preview.filename)}
            captionShort={c.afterCaptionShort(preview.filename)}
          />
        </div>

        {/* §1.10 Body — names how to go back */}
        <p className="m-0 mt-[16px] md:mt-[18px] text-[13.5px] md:text-[15px] leading-[1.6] md:leading-[1.65] text-pretty [overflow-wrap:anywhere] text-[color:var(--fg-body)]">
          <span className="md:hidden">{words.bodyShort}</span>
          <span className="hidden md:inline">{words.body}</span>
        </p>

        {/* §1.11 The one red on the dialog, and only on a failed confirm (correction 7) */}
        {error && (
          <p role="alert" className="m-0 mt-[10px] text-[13px] text-[color:var(--danger)]">{error}</p>
        )}

        {/* §1.12 Buttons. DOM order is [Keep][Replace], left to right on desktop; the phone
            stacks the primary on top with flex-col-reverse, as this dialog always has. */}
        <div className="mt-[20px] md:mt-[24px] flex flex-col-reverse md:flex-row gap-[10px] md:gap-[12px]">
          <button
            ref={keepRef}
            type="button"
            onClick={onClose}
            disabled={pending}
            // §1.13 Keep current — the hairline, 44 phone / 46 desktop
            className="flex h-[44px] md:h-[46px] w-full md:w-auto md:flex-none items-center justify-center rounded-[10px] md:rounded-lg px-[22px] font-sans font-semibold text-[14px] text-[color:var(--fg)] bg-transparent [border:1px_solid_var(--border-strong)] cursor-pointer disabled:cursor-default disabled:opacity-60"
          >
            {words.keep}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            // §1.14 Replace with N cards — the bone fill, 48 phone / 46 desktop
            className="flex h-[48px] md:h-[46px] w-full md:flex-1 items-center justify-center rounded-[10px] md:rounded-lg font-sans font-semibold text-[15px] md:text-[14px] bg-[color:var(--fg)] text-[color:var(--bg)] cursor-pointer disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? words.pending : words.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One side of the pair: a mono label, the figure, and a caption that is short on a phone. */
function Figure({
  label,
  value,
  caption,
  captionShort,
}: {
  label: string;
  value: string;
  caption: string;
  captionShort: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{label}</div>
      <div className="mt-[3px] md:mt-[4px] font-mono text-[19px] md:text-[21px] font-semibold text-[color:var(--fg)]">{value}</div>
      {/* A filename has no length cap and often no spaces, so it breaks anywhere rather than
          push the pair out of the sheet. */}
      <div className="mt-[2px] text-[11.5px] md:text-[12px] [overflow-wrap:anywhere] text-[color:var(--fg-muted)]">
        <span className="md:hidden">{captionShort}</span>
        <span className="hidden md:inline">{caption}</span>
      </div>
    </div>
  );
}
