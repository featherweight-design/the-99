"use client";

// "Additional notes" (H35, STATES-deck-description.md §3 states 1/3, PR 3): one note per press,
// held in the panel's own state and never saved anywhere — it rides into the next run's prompt
// (PR 4b) and is gone once that run lands.

import { countCharacters } from "../../lib/copy/deck-tuning";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { useIsDesktop } from "../ui/use-is-desktop";

const copy = deckDescriptionCopy.notes;

export function TuningNotesField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const desktop = useIsDesktop();
  const n = countCharacters(value);
  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor="tuning-notes-field" className="block font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
        {copy.label}
      </label>
      <textarea
        id="tuning-notes-field"
        value={value}
        onChange={(e) => {
          if (countCharacters(e.target.value) <= copy.maxLength) onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          // Esc clears the draft rather than committing it — there is nothing server-side to
          // cancel (this field is never saved), so a reset to empty is the whole of "Cancel".
          if (e.key === "Escape") onChange("");
        }}
        rows={2}
        placeholder={desktop ? copy.placeholder : copy.placeholderPhone}
        aria-label={copy.label}
        // 16px below `md`, same iOS Safari zoom-on-focus reason as the description field.
        className="w-full resize-none rounded-[8px] font-sans text-[16px] leading-[1.5] md:text-[13.5px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          padding: "10px 12px",
          color: "var(--fg)",
        }}
      />
      <span className="self-end font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
        {copy.counter(n, copy.maxLength)}
      </span>
    </div>
  );
}
