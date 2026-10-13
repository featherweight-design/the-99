"use client";

// "Additional notes" (H35, STATES-deck-description.md §3 states 1/3, PR 3): one note per press,
// held in the panel's own state and never saved anywhere — it rides into the next run's prompt
// (PR 4b, `tuning-actions.ts`'s `runTuning`) and is gone once that run lands.
//
// It takes the Notes `[[` card tag (card-tags plan, PR 2). The panel's value is the BODY, with a tag as
// `[[id|Name]]`; the box shows the name, and the server resolves each tag to the catalog's name before
// the words reach the prompt.

import { useEffect, useMemo, useRef } from "react";
import { searchTagCards } from "../../app/cards/tag-actions";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { serialize, toField } from "../../lib/decks/notes-field";
import { NOTES_TAGS_MAX } from "../../lib/tuning/limits";
import { CardTagList, useCardTagPicker } from "../cards/card-tag-picker";
import { InfoTip } from "../ui/info-tip";
import { useIsDesktop } from "../ui/use-is-desktop";

const copy = deckDescriptionCopy.notes;
/** Two rows' worth at this field's own line-height/padding — the review-specified starting
 *  height, and the floor `GROW_MIN_PX` keeps it from shrinking under its own placeholder. */
const GROW_MIN_PX = 64;

/** The picker's lookup, module-level so its identity is stable across renders. */
const searchNotesCards = (query: string) => searchTagCards("tuning", query);

export function TuningNotesField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const desktop = useIsDesktop();
  const ref = useRef<HTMLTextAreaElement>(null);
  const field = useMemo(() => toField(value), [value]);
  const picker = useCardTagPicker({
    value: field.text, picked: field.picked, search: searchNotesCards, max: copy.maxLength, maxTags: NOTES_TAGS_MAX, field: ref,
    onChange: (text, picked) => onChange(serialize(text, picked)),
  });
  const n = picker.count;
  // Grows with its content (review fix) rather than sitting fixed at two rows: measured off the
  // textarea's own `scrollHeight`, which only reflects real layout in a browser — jsdom reports
  // 0, so this is a no-op there and the field keeps its CSS floor.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = el.scrollHeight;
    if (next > 0) el.style.height = `${next}px`;
  }, [field.text]);
  const infoId = "tuning-notes-field-info";
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="relative flex items-center gap-[8px]">
        <label htmlFor="tuning-notes-field" className="block font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
          {copy.label}
        </label>
        <InfoTip id={infoId} lines={copy.tagHelp.lines} label={copy.tagHelp.infoAria} className="self-center" />
        <button
          type="button"
          aria-label={copy.tagHelp.insertAria}
          onMouseDown={(e) => e.preventDefault()}
          onClick={picker.insertTag}
          className="ml-auto h-[24px] cursor-pointer rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[8px] font-mono text-[11px] text-[color:var(--fg-muted)]"
        >
          {copy.tagHelp.insert}
        </button>
      </div>
      <div className="relative">
        <textarea
          ref={ref}
          id="tuning-notes-field"
          value={field.text}
          {...picker.fieldProps}
          aria-describedby={infoId}
          onChange={(e) => picker.typed(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            // The picker owns its keys while it is open (Escape closes the list); what is left is ours.
            if (picker.onKeyDown(e)) return;
            // Escape cancels an IME composition candidate first, same as the deck header's own
            // description editor — without this guard, Escape during Japanese/Chinese/Korean
            // input clears the whole draft instead (review round 2).
            if (e.nativeEvent.isComposing) return;
            // Esc clears the draft rather than committing it — there is nothing server-side to
            // cancel (this field is never saved), so a reset to empty is the whole of "Cancel".
            if (e.key === "Escape") onChange("");
          }}
          rows={2}
          placeholder={desktop ? copy.placeholder : copy.placeholderPhone}
          aria-label={copy.label}
          // 16px below `md`, same iOS Safari zoom-on-focus reason as the description field.
          className="w-full resize-none overflow-hidden rounded-[8px] font-sans text-[16px] leading-[1.5] md:text-[13.5px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            padding: "10px 12px",
            color: "var(--fg)",
            minHeight: GROW_MIN_PX,
          }}
        />
        {picker.open && <CardTagList {...picker.list} />}
      </div>
      <span className="self-end font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
        {copy.counter(n, copy.maxLength)}
      </span>
    </div>
  );
}
