"use client";

import { useId } from "react";
import { CreditsText } from "../ui/credits-text";

/**
 * The method-changed notice (addendum_method_notice, 2026-10-10): inside the Overview section,
 * under its label row and above the held paragraph, so where it sits says what the press touches.
 *
 * NOT THE STALE BANNER, and drawn to be told apart from it: dashed `--border-dashed` on
 * `--surface-sunken` (the banner is solid `--border-strong` on `--surface-rail`), the Overview's
 * outlined button where the banner's is filled, and a line that opens "We've changed", never
 * "Your deck". Not dismissible: it is a caption on the text below it, and it goes when a write makes
 * the shown overview the new method's.
 *
 * ONE DOM, TWO LAYOUTS, by grid areas rather than by two copies of the text. 1300: the mark, a
 * left stack (line over note), the button centered on both rows. 390: the mark beside the line,
 * a full-width 44px button, then the note centered. With no button (1f) the button row is gone.
 *
 * The mark is the stats InfoTip ring, static and `aria-hidden`, `i` while informing and `!` once a
 * free try failed. It never changes color: `role="alert"` carries the error.
 */
export function MethodNotice({
  line, note, alert, cta,
}: {
  line: string;
  /** Null draws none: the paid fallback's shipped credit note is absent while the reading is stale. */
  note: string | null;
  /** A failure (lines B and C): announced at once, and the mark reads `!`. */
  alert: boolean;
  /** Null in 1f, where the stale banner's Re-analyze is the one press. */
  cta: { label: string; disabled: boolean; busy: boolean; onPress: () => void } | null;
}) {
  const noteId = useId();
  const inert = cta ? cta.disabled || cta.busy : false;
  const areas = cta
    ? "[grid-template-areas:'icon_line''cta_cta''note_note'] md:grid-cols-[18px_minmax(0,1fr)_auto] md:[grid-template-areas:'icon_line_cta''icon_note_cta']"
    : "[grid-template-areas:'icon_line''note_note'] md:grid-cols-[18px_minmax(0,1fr)] md:[grid-template-areas:'icon_line''icon_note']";
  return (
    <div
      data-testid="method-notice"
      className={`mb-[8px] mt-[2px] grid grid-cols-[18px_minmax(0,1fr)] gap-x-[10px] gap-y-[10px] rounded-[9px] border border-dashed border-[var(--border-dashed)] bg-[var(--surface-sunken)] px-[14px] py-[13px] md:items-start md:gap-x-[11px] md:gap-y-[4px] ${areas}`}
    >
      <span
        aria-hidden="true"
        className="flex h-[18px] w-[18px] items-center justify-center self-start rounded-full border border-[var(--fg-faint)] font-mono text-[10.5px] font-semibold leading-none text-[var(--fg-muted)] [grid-area:icon] md:mt-[1px]"
      >
        {alert ? "!" : "i"}
      </span>
      <p
        role={alert ? "alert" : "status"}
        className="m-0 min-w-0 text-[13px] leading-[1.5] text-[var(--fg-body)] [grid-area:line] [text-wrap:pretty] md:text-[13.5px]"
      >
        {line}
      </p>
      {cta ? (
        <button
          type="button"
          onClick={inert ? undefined : cta.onPress}
          aria-disabled={inert || undefined}
          aria-busy={cta.busy || undefined}
          aria-describedby={note ? noteId : undefined}
          className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-[8px] border border-[var(--border-strong)] px-[16px] text-[13.5px] font-medium [grid-area:cta] md:ml-[9px] md:min-h-[36px] md:w-auto md:self-center md:whitespace-nowrap md:text-[13px] ${inert ? "cursor-default text-[var(--fg-disabled)]" : "cursor-pointer text-[var(--fg)]"}`}
        >
          {cta.label}
        </button>
      ) : null}
      {note ? <span
        id={noteId}
        className="min-w-0 text-center font-mono text-[9.5px] leading-[1.55] text-[var(--fg-faint)] [grid-area:note] [text-wrap:pretty] md:text-left md:text-[11px]"
      >
        <CreditsText text={note} />
      </span> : null}
    </div>
  );
}
