"use client";

import { useState } from "react";
import { countCharacters } from "../../lib/copy/deck-tuning";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { MutationError } from "./mutation-error";

const copy = deckDescriptionCopy.description;

/**
 * The empty-state description field (STATES-deck-description.md §1), between the second
 * paragraph and Analyze. CONTROLLED — `AnalysisEmpty` owns the value and the save, because the
 * press needs the field's latest text to await its own save before it reads (engineering note
 * 1): a field with its own local state could not hand that value to a sibling button reliably.
 *
 * The counter is ALWAYS drawn, at the help text's end, in a fixed column, so the help text
 * never reflows as the count grows a digit.
 */
export function DeckDescriptionField({
  value,
  onChange,
  onBlur,
  saving,
  refused,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Blur saves (STATES §1, state 3) — the press saves through the same path, in the caller. */
  onBlur: () => void;
  saving: boolean;
  refused: string | null;
}) {
  const n = countCharacters(value);
  const over = n > copy.maxLength;
  const warn = n >= copy.warnAt;
  const [focused, setFocused] = useState(false);

  return (
    <div className="mt-[14px] flex flex-col gap-[6px] md:mt-[16px]">
      <label
        htmlFor="deck-description-field"
        className="block font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {copy.label}
      </label>
      <textarea
        id="deck-description-field"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        onChange={(e) => {
          if (countCharacters(e.target.value) <= copy.maxLength) onChange(e.target.value);
        }}
        rows={2}
        readOnly={saving}
        placeholder={copy.placeholder}
        aria-label={copy.fieldAria}
        className="w-full resize-none rounded-[8px] font-sans focus-visible:outline-none"
        style={{
          background: "var(--surface)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border-strong)"}`,
          padding: "10px 12px",
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "var(--fg)",
        }}
      />
      <p className="m-0 flex items-baseline justify-between gap-[10px] text-[12px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        <span>{copy.help}</span>
        <span
          className="flex-none font-mono"
          style={{ color: over ? "var(--danger)" : warn ? "var(--warning)" : "var(--fg-faint)" }}
        >
          {copy.counter(n, copy.maxLength)}
        </span>
      </p>
      {refused ? <MutationError message={refused} /> : null}
    </div>
  );
}
