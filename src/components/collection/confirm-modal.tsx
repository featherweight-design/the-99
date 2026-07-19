"use client";
// Replace Flow — Step 3 (Type-to-Confirm Modal) per property table.
// Danger dialog; button disabled at opacity 0.6 until input === "REPLACE".
// READINESS #5: focus trap + Escape + labelled input.

import { useEffect, useRef, useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";

const CONFIRM_TOKEN = "REPLACE";

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
  const triggerRef = useRef<HTMLElement | null>(null);
  const armed = value === CONFIRM_TOKEN;

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => { triggerRef.current?.focus(); };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); if (!pending) onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    // §Backdrop: rgba(8,6,4,0.74) desktop
    <div
      className="fixed inset-0 z-50 flex items-center md:items-center justify-center"
      role="presentation"
      onClick={() => { if (!pending) onClose(); }}
      style={{ background: "rgba(8,6,4,0.74)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: bottom sheet (§Mobile: Bottom Sheet: bg #1A160F (--surface-rail), radius 22px 22px 34px 34px, padding 26px 22px 30px)
        // Desktop: §Desktop: Modal Container: 520px, bg #1A160F, border 1px #3A3229, radius 16px, padding 32px 34px 30px, shadow 0 40px 100px rgba(0,0,0,0.7)
        className="w-full md:w-[520px] rounded-t-[22px] md:rounded-2xl p-[26px_22px_30px] md:p-[32px_34px_30px] mt-auto md:mt-0"
        style={{
          background: "var(--surface-rail)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        {/* Mobile drag handle — §Mobile: Sheet Drag Handle: 40×4, radius 999px, bg #3A3229 (--border-strong), margin 0 auto 20px */}
        <div className="md:hidden mx-auto mb-[20px] rounded-full" style={{ width: 40, height: 4, background: "var(--border-strong)" }} />

        {/* Warning icon header — §Warning Icon Header + §Warning Icon */}
        <div className="flex items-center gap-[12px] md:gap-[14px]">
          <span
            aria-hidden
            className="flex-none rounded-full flex items-center justify-center text-[18px] md:text-[22px] w-[40px] h-[40px] md:w-[48px] md:h-[48px]"
            style={{
              background: "rgba(198,83,63,0.14)",
              border: "1px solid #4A2F28",
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
            Replace your collection?
          </h2>
        </div>

        {/* Body — §Modal Body Copy: 13.5/15px --fg-body */}
        <p
          className="text-[13.5px] md:text-[15px] mt-[16px] md:mt-[18px]"
          style={{ color: "var(--fg-body)", lineHeight: 1.65 }}
        >
          <span className="md:hidden">
            This permanently swaps your {preview.currentCollectionCount.toLocaleString()} cards for the {preview.matchedCardCount.toLocaleString()} in {preview.filename}. It can&apos;t be undone.
          </span>
          <span className="hidden md:inline">
            This permanently swaps your {preview.currentCollectionCount.toLocaleString()} cards for the {preview.matchedCardCount.toLocaleString()} cards in {preview.filename}. Decks and commander recommendations rebuild from the new collection. This can&apos;t be undone.
          </span>
        </p>

        {/* Type-to-confirm section — §Type-to-Confirm Section: margin-top 18/22px */}
        <div className="mt-[18px] md:mt-[22px]">
          <label
            htmlFor="confirm-input"
            className="block font-mono uppercase text-[10px] md:text-[10.5px] tracking-[0.1em] mb-[8px] md:mb-[9px]"
            style={{ color: "var(--fg-faint)" }}
          >
            Type <span style={{ color: "var(--danger)" }}>REPLACE</span> to confirm
          </label>
          <input
            id="confirm-input"
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="confirm-hint"
            // §Confirm Input Field: bg #181410 (--surface-sunken), border 1px #C6533F (--danger), radius 8px, padding 12/13px 14/16px, mono 15/16px, --fg, letter-spacing 0.1/0.12em
            className="w-full rounded-lg font-mono text-[15px] md:text-[16px] tracking-[0.1em] md:tracking-[0.12em] p-[12px_14px] md:p-[13px_16px]"
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--danger)",
              color: "var(--fg)",
            }}
          />
        </div>

        {error && (
          <p className="mt-[10px] text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {/* Button row — §Button Row: desktop flex gap 12px margin-top 22px; mobile stacks */}
        <div className="mt-[22px] flex flex-col md:flex-row gap-[12px]">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!armed || pending}
            // §Confirm Button — Disabled: bg #3A2019, border 1px #C6533F (--danger), color --fg, radius 8px, opacity 0.6; armed → opacity 1
            className="rounded-lg font-sans font-semibold text-[15px] md:text-[14px] w-full md:flex-1 py-[14px] md:py-[13px] cursor-pointer"
            style={{
              color: "var(--fg)",
              background: "#3A2019",
              border: "1px solid var(--danger)",
              opacity: armed && !pending ? 1 : 0.6,
            }}
          >
            {pending ? "Replacing…" : `Replace ${preview.currentCollectionCount.toLocaleString()} cards`}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            // §Cancel / Keep Button — mobile text-only #8E8269 (--fg-faint), desktop outlined
            className="w-full md:flex-none font-sans font-semibold text-[14px] py-[12px] md:py-[13px] md:px-[22px] md:rounded-lg"
            style={{
              color: "var(--fg-faint)",
              background: "transparent",
              border: "none",
            }}
          >
            <span className="md:hidden">Keep my current collection</span>
            <span className="hidden md:inline" style={{ color: "var(--fg)" }}>Keep current</span>
          </button>
        </div>

        {/* Hint — §Hint Text: mono 10.5px --fg-locked, letter-spacing 0.04em, text-center, margin-top 14px */}
        <p
          id="confirm-hint"
          className="hidden md:block font-mono text-[10.5px] text-center mt-[14px] tracking-[0.04em]"
          style={{ color: "var(--fg-locked)" }}
        >
          Button unlocks once REPLACE is typed in full
        </p>
      </div>
    </div>
  );
}
