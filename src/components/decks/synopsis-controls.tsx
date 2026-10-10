"use client";

import { useId } from "react";

import { synopsisCopy } from "../../lib/copy/synopsis";

// The overview's two controls, shared by the tab and the modal (`SYNOPSIS-modal.md`, Round 0
// states 2 and 4).
//
// A DISABLED PRESS STAYS FOCUSABLE (audit finding 10d): `aria-disabled` rather than `disabled`,
// so a screen reader still reaches the button and the credit note it is described by, which is
// the one place the reader learns why it will not press and when it will again.

/** The outlined press both rows draw: 44px on the phone, 36px (34px in the modal) from `md`. */
export function Press({
  label, note, disabled, busy, onPress, compact = false,
}: {
  label: string;
  note: string | null;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const noteId = useId();
  const inert = disabled || busy;
  return (
    <div className="mt-[4px] flex flex-col items-stretch gap-[9px] md:mt-[6px] md:flex-row md:flex-wrap md:items-center md:gap-[16px]">
      <button
        type="button"
        onClick={inert ? undefined : onPress}
        aria-disabled={inert || undefined}
        aria-busy={busy || undefined}
        aria-describedby={note ? noteId : undefined}
        className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-[8px] border border-[var(--border-strong)] px-[16px] text-[13px] font-medium md:w-auto ${compact ? "md:min-h-[34px]" : "md:min-h-[36px]"} ${inert ? "cursor-default text-[var(--fg-disabled)]" : "cursor-pointer text-[var(--fg)]"}`}
      >
        {label}
      </button>
      {note ? (
        <p id={noteId} className="m-0 text-center font-mono text-[9.5px] leading-[1.55] text-[var(--fg-faint)] md:min-w-0 md:flex-[1_1_280px] md:text-left md:text-[11px]">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** Round 0's write line: one `--fg-faint` line, the button, and its credit note beside it at 1300. */
export function WriteRow({
  line, label, note, disabled, busy, onPress,
}: {
  line: string;
  /** Null draws the line alone: the method-change notice above holds the one press (build rule 7). */
  label: string | null;
  note: string | null;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <div className="flex flex-col gap-[7px] md:gap-[8px]">
      <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-faint)] md:text-[13.5px]">{line}</p>
      {label ? <Press label={label} note={note} disabled={disabled} busy={busy} onPress={onPress} /> : null}
    </div>
  );
}

/** A refused section's slot: the `not written` tag, the sentence, the count and `Try again`. */
export function RefusedSlot({
  sentence, failed, total, onRetry, busy, note, spent, compact = false,
}: {
  sentence: string;
  failed: number;
  total: number;
  onRetry: (() => void) | null;
  busy: boolean;
  note: string | null;
  spent: boolean;
  /** The modal's slot: a 34px button, a 13px sentence at both widths and an 8px gap throughout. */
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-start ${compact ? "gap-[8px]" : "gap-[7px] md:gap-[8px]"}`}>
      <span className="rounded-full border border-[var(--danger)] px-[8px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--danger)]">
        {synopsisCopy.notWritten}
      </span>
      <p className={`m-0 text-[13px] leading-[1.6] text-[var(--fg-muted)] [text-wrap:pretty] ${compact ? "" : "md:text-[13.5px]"}`}>{sentence}</p>
      <p className="m-0 font-mono text-[10.5px] text-[var(--fg-faint)]">{synopsisCopy.failedCount(failed, total)}</p>
      {onRetry ? (
        <div className="w-full">
          <Press label={synopsisCopy.tryAgain} note={note} disabled={spent} busy={busy} onPress={onRetry} compact={compact} />
        </div>
      ) : null}
    </div>
  );
}
