"use client";

import { useRef, useState } from "react";
import { countCharacters } from "../../lib/copy/deck-tuning";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { plainText } from "../../lib/decks/notes-body";
import { NOTES_TAGS_MAX } from "../../lib/tuning/limits";
import { CardTagList } from "../cards/card-tag-picker";
import { searchDescriptionCards } from "../cards/description-tag-search";
import { TagHelpRow } from "../cards/tag-help-row";
import { useTaggedField } from "../cards/use-tagged-field";
import { MutationError } from "./mutation-error";

const copy = deckDescriptionCopy.description;

/**
 * The empty-state description field (STATES-deck-description.md §1), between the second
 * paragraph and Analyze. CONTROLLED — `AnalysisEmpty` owns the value and the save, because the
 * press needs the field's latest text to await its own save before it reads (engineering note
 * 1): a field with its own local state could not hand that value to a sibling button reliably.
 *
 * It takes the `[[` card tag (card-tags plan, PR 3): `value` is the BODY, with a tag as `[[id|Name]]`, and the server
 * stores each tag as the catalog's name in plain words. The counter counts what is drawn.
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const { field, picker } = useTaggedField({ value, onChange, search: searchDescriptionCards, max: copy.maxLength, maxTags: NOTES_TAGS_MAX, field: ref });
  const n = countCharacters(plainText(value));
  const over = n > copy.maxLength;
  const warn = n >= copy.warnAt;
  const [focused, setFocused] = useState(false);

  return (
    <div className="mt-[14px] flex flex-col gap-[6px] md:mt-[16px]">
      <TagHelpRow htmlFor="deck-description-field" label={copy.label} infoId="deck-description-field-info" help={deckDescriptionCopy.notes.tagHelp} onInsert={picker.insertTag} />
      <div className="relative">
      <textarea
        ref={ref}
        id="deck-description-field"
        value={field.text}
        {...picker.fieldProps}
        aria-describedby="deck-description-field-info"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        onChange={(e) => picker.typed(e.target.value, e.target.selectionStart)}
        onKeyDown={(e) => { picker.onKeyDown(e); }}
        readOnly={saving}
        rows={2}
        placeholder={copy.placeholder}
        // No `aria-label`: the visible `<label htmlFor>` above already names this field, and an
        // aria-label would override it with different words a voice-control user can't see.
        // 16px below `md`: iOS Safari zooms the viewport on focusing any input under 16px, and
        // this field is shared at both widths (pre-open review) — `md:text-[13.5px]` is the
        // desktop size the retired single-field editor used.
        // No `focus-visible:outline-none`: keyboard focus needs the global 2px accent ring
        // (globals.css), which this class used to suppress with nothing replacing it.
        className="w-full resize-none rounded-[8px] font-sans text-[16px] leading-[1.5] md:text-[13.5px]"
        style={{
          background: "var(--surface)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border-strong)"}`,
          padding: "10px 12px",
          color: "var(--fg)",
        }}
      />
      {picker.open && <CardTagList {...picker.list} />}
      </div>
      <p className="m-0 flex items-baseline justify-between gap-[10px] text-[12px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        <span>{copy.help}</span>
        <span
          // Fixed to 9 monospace characters — "240 / 240", the widest this counter ever draws
          // — so the help text's wrapping does not shift as the count grows a digit while typing.
          className="flex-none text-right font-mono"
          style={{ width: "9ch", color: over ? "var(--danger)" : warn ? "var(--warning)" : "var(--fg-faint)" }}
        >
          {copy.counter(n, copy.maxLength)}
        </span>
      </p>
      {refused ? <MutationError message={refused} /> : null}
    </div>
  );
}
