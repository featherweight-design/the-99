"use client";
// Replace Flow — Step 3 (Type-to-Confirm Modal) per property table.
// Danger dialog; button disabled at opacity 0.6 until input matches the token.
// Token branches with currentCollectionCount: initial import gates on IMPORT
// (nothing is being replaced yet — issue #47); the replace flow keeps REPLACE.
// READINESS #5: focus trap + Escape + labelled input.

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { UploadPreview } from "../../app/collection/actions";
import { TextField } from "../ui/text-field";

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
  const [value, setValue] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialImport = preview.currentCollectionCount === 0;
  const confirmToken = isInitialImport ? "IMPORT" : "REPLACE";
  const armed = value === confirmToken;

  // Focus trap, Escape, focus-return. Escape is refused while pending: the
  // replace is already running and can't be undone, so dismissing would only
  // hide it. The backdrop click below is guarded on pending for the same reason.
  useDialogA11y(dialogRef, onClose, {
    initialFocusRef: inputRef,
    closeOnEscape: !pending,
  });

  // Both buttons disable while pending, which would drop focus out of the
  // dialog; the input is the only thing left to hold it.
  useEffect(() => { if (pending) inputRef.current?.focus(); }, [pending]);

  return (
    // §Backdrop at 0.74 desktop, mixed against the canvas so the dim tracks the theme
    <div
      className="fixed inset-0 z-50 flex items-center md:items-center justify-center bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] md:bg-[color-mix(in_oklab,var(--bg)_74%,transparent)]"
      role="presentation"
      onClick={() => { if (!pending) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: bottom sheet (§Mobile: Bottom Sheet: bg --surface-rail, radius 22px 22px 34px 34px, padding 26px 22px 30px)
        // Desktop: §Desktop: Modal Container: 520px, bg var(--surface-rail), border 1px var(--border-strong), radius 16px, padding 32px 34px 30px, shadow --modal-shadow
        className="w-full md:w-[520px] rounded-[22px_22px_34px_34px] md:rounded-2xl p-[26px_22px_30px] md:p-[32px_34px_30px] mt-auto md:mt-0 [border-top:1px_solid_var(--border-strong)] md:[border:1px_solid_var(--border-strong)]"
        style={{
          background: "var(--surface-rail)",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        {/* Mobile drag handle — §Mobile: Sheet Drag Handle: 40×4, radius 999px, bg --border-strong, margin 0 auto 20px */}
        <div className="md:hidden mx-auto mb-[20px] rounded-full" style={{ width: 40, height: 4, background: "var(--border-strong)" }} />

        {/* Warning icon header — §Warning Icon Header + §Warning Icon */}
        <div className="flex items-center gap-[12px] md:gap-[14px]">
          <span
            aria-hidden
            className="flex-none rounded-full flex items-center justify-center text-[18px] md:text-[22px] w-[40px] h-[40px] md:w-[48px] md:h-[48px]"
            style={{
              background: "color-mix(in oklab, var(--danger) 14%, transparent)",
              border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)",
              color: "var(--danger)",
            }}
          >
            ⚠
          </span>
          <h2
            id="confirm-title"
            className="font-display font-bold text-[20px] md:text-[25px] m-0"
            style={{ color: "var(--fg)", lineHeight: 1.15 }}
          >
            {isInitialImport ? "Import this collection?" : "Replace your collection?"}
          </h2>
        </div>

        {/* Body — §Modal Body Copy: 13.5/15px --fg-body. Numeric counts, filename, and the "This can't be undone" clause are bolded per the mock in #34. Emphasis uses --fg (primary) so it reads against the muted body color. */}
        <p
          className="text-[13.5px] md:text-[15px] mt-[16px] md:mt-[18px] leading-[1.6] md:leading-[1.65]"
          style={{ color: "var(--fg-body)" }}
        >
          {isInitialImport ? (
            <>
              <span className="md:hidden">
                This imports the <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.matchedCardCount.toLocaleString()}</strong> cards in <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.filename}</strong> as your collection.
              </span>
              <span className="hidden md:inline">
                This imports the <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.matchedCardCount.toLocaleString()}</strong> cards in <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.filename}</strong> as your collection. Decks and commander recommendations build from it.
              </span>
            </>
          ) : (
            <>
              <span className="md:hidden">
                This permanently swaps your <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.currentCollectionCount.toLocaleString()}</strong> cards for the <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.matchedCardCount.toLocaleString()}</strong> in <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.filename}</strong>. <strong className="font-semibold" style={{ color: "var(--fg)" }}>It can&apos;t be undone.</strong>
              </span>
              <span className="hidden md:inline">
                This permanently swaps your <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.currentCollectionCount.toLocaleString()}</strong> cards for the <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.matchedCardCount.toLocaleString()}</strong> cards in <strong className="font-semibold" style={{ color: "var(--fg)" }}>{preview.filename}</strong>. Your deck lists stay as they are; recommendations and availability update from the new collection. <strong className="font-semibold" style={{ color: "var(--fg)" }}>This can&apos;t be undone.</strong>
              </span>
            </>
          )}
        </p>

        {/* Type-to-confirm section — §Type-to-Confirm Section: margin-top 18/22px */}
        <div className="mt-[18px] md:mt-[22px]">
          <label
            htmlFor="confirm-input"
            className="block font-mono uppercase text-[10px] md:text-[10.5px] tracking-[0.1em] mb-[8px] md:mb-[9px]"
            style={{ color: "var(--fg-faint)" }}
          >
            Type <span style={{ color: "var(--danger)" }}>{confirmToken}</span> to confirm
          </label>
          <TextField
            id="confirm-input"
            ref={inputRef}
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            // §Confirm Input Field: bg --surface-sunken, border 1px --danger, radius 8px, padding 12/13px 14/16px, mono 15/16px, --fg, letter-spacing 0.1/0.12em
            className="w-full font-mono text-[15px] md:text-[16px] tracking-[0.1em] md:tracking-[0.12em] p-[12px_14px] md:p-[13px_16px] border-[color:var(--danger)]"
          />
        </div>

        {error && (
          <p className="mt-[10px] text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {/* Button row — §Button Row. Desktop: primary (destructive) on the right, secondary on the left; DOM order is [Secondary][Primary] so keyboard tab flows left→right in the same direction the eye reads. Mobile: flex-col-reverse keeps the primary visually on top of the stack while the DOM order stays consistent across breakpoints (mobile users are tapping, so DOM/visual divergence on the stacked layout is intentional). Initial-import secondary label is "Go back" (nothing to keep yet); replace flow keeps "Keep current". */}
        <div className="mt-[22px] flex flex-col-reverse md:flex-row gap-[12px]">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            // §Cancel / Keep Button — mobile text-only --fg-faint, padding 12px 0 0;
            // desktop outlined 1px --border-strong, padding 13px 22px, accent border on hover
            className="w-full md:w-auto md:flex-none font-sans font-semibold text-[14px] cursor-pointer pt-[12px] pb-0 px-0 md:p-[13px_22px] md:rounded-lg md:[border:1px_solid_var(--border-strong)] md:hover:[border:1px_solid_var(--accent)] text-[color:var(--fg-faint)] bg-transparent"
          >
            {isInitialImport ? (
              <>
                <span className="md:hidden">Go back</span>
                <span className="hidden md:inline" style={{ color: "var(--fg)" }}>Go back</span>
              </>
            ) : (
              <>
                <span className="md:hidden">Keep my current collection</span>
                <span className="hidden md:inline" style={{ color: "var(--fg)" }}>Keep current</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!armed || pending}
            // §Confirm Button — Disabled: a dim wash of --danger, border 1px --danger, color --fg, radius 8px, opacity 0.6; armed → opacity 1
            className="rounded-lg font-sans font-semibold text-[15px] md:text-[14px] w-full md:flex-1 py-[14px] md:py-[13px] cursor-pointer text-[color:var(--fg)] bg-[color-mix(in_srgb,var(--danger)_22%,var(--bg))] border border-[color:var(--danger)]"
            style={{ opacity: armed && !pending ? 1 : 0.6 }}
          >
            {pending
              ? isInitialImport
                ? "Importing…"
                : "Replacing…"
              : isInitialImport
                ? `Import ${preview.matchedCardCount.toLocaleString()} cards`
                : `Replace ${preview.currentCollectionCount.toLocaleString()} cards`}
          </button>
        </div>
      </div>
    </div>
  );
}
