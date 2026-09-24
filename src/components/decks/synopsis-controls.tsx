"use client";

import { synopsisCopy } from "../../lib/copy/synopsis";

// The overview's two controls, shared by the tab and the modal.

/** Round 0's write line: one `--fg-faint` line, the button, and its credit note beside it at 1300. */
export function WriteRow({
  line, label, note, disabled, busy, onPress,
}: {
  line: string;
  label: string;
  note: string | null;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-[13px] leading-[1.55] md:text-[13.5px] text-[var(--fg-faint)]">{line}</p>
      <div className="flex flex-col items-stretch gap-[8px] md:flex-row md:flex-wrap md:items-center md:gap-[14px]">
        <button
          type="button"
          onClick={onPress}
          disabled={disabled || busy}
          aria-busy={busy || undefined}
          className={`min-h-[44px] w-full rounded-[8px] border border-[var(--border-strong)] px-[16px] text-[13px] font-medium md:min-h-[36px] md:w-auto cursor-pointer disabled:cursor-default ${disabled ? "text-[var(--fg-disabled)]" : "text-[var(--fg)]"}`}
        >
          {label}
        </button>
        {note ? (
          <p className="text-center font-mono text-[9.5px] leading-[1.55] md:flex-[1_1_280px] md:text-left md:text-[11px] text-[var(--fg-faint)]">
            {note}
          </p>
        ) : null}
      </div>
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
  /** The modal's slot: a 34px button rather than the tab's 36px. */
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-[8px]">
      <span
        className="rounded-full border border-[var(--danger)] px-[8px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--danger)]"
      >
        {synopsisCopy.notWritten}
      </span>
      <p className="text-[13px] leading-[1.6] md:text-[13.5px] text-[var(--fg-muted)]">{sentence}</p>
      <p className="font-mono text-[10.5px] text-[var(--fg-faint)]">{synopsisCopy.failedCount(failed, total)}</p>
      {onRetry ? (
        <div className="flex w-full flex-col items-stretch gap-[8px] md:w-auto md:flex-row md:items-center md:gap-[14px]">
          <button
            type="button"
            onClick={onRetry}
            disabled={busy || spent}
            aria-busy={busy || undefined}
            className={`min-h-[44px] rounded-[8px] border border-[var(--border-strong)] px-[16px] text-[13px] font-medium cursor-pointer disabled:cursor-default ${compact ? "md:min-h-[34px]" : "md:min-h-[36px]"} ${spent ? "text-[var(--fg-disabled)]" : "text-[var(--fg)]"}`}
          >
            {synopsisCopy.tryAgain}
          </button>
          {note ? <p className="text-center font-mono text-[9.5px] leading-[1.55] md:text-left md:text-[11px] text-[var(--fg-faint)]">{note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
