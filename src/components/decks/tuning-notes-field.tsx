"use client";

// The request box (H35 "Additional notes", and Suggested changes v2's request): one note per press, held in the
// caller's own state and never saved anywhere — it rides into the next run's prompt (`tuning-actions.ts`'s
// `runTuning`) and is gone once that run lands.
//
// One frame holds the text, with the `[[ ]]` key, its words and the counter in the frame's foot (the shared TaggedBox), the same in both
// uses. `labelRow` adds the visible label and the "how card tags work" tip above the frame (Additional notes): that box
// also clears its draft on Escape (nothing server-side to cancel), except while the tip is open or an IME composes. The
// request box has no label row (the step's own heading names it; `label` is its accessible name) and Escape never
// clears it: chips write into it, and an Escape meant for a list must never empty a request the press would send.
//
// It takes the Notes `[[` card tag (card-tags plan, PR 2). The panel's value is the BODY, with a tag as
// `[[id|Name]]`; the box shows the name, and the server resolves each tag to the catalog's name before
// the words reach the prompt.

import { useEffect, useRef } from "react";
import { searchTagCards } from "../../app/cards/tag-actions";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { NOTES_TAGS_MAX } from "../../lib/tuning/limits";
import { CardTagList } from "../cards/card-tag-picker";
import { TaggedBox } from "../cards/tagged-box";
import { useTaggedField } from "../cards/use-tagged-field";
import { InfoTip } from "../ui/info-tip";
import { useIsDesktop } from "../ui/use-is-desktop";

const copy = deckDescriptionCopy.notes;
/** The request box's floor while it grows to its content; `rows={3}` already sizes the box above it. */
const FRAMED_MIN_PX = 72;

/** The picker's lookup, module-level so its identity is stable across renders. */
const searchNotesCards = (query: string) => searchTagCards("tuning", query);

/** A chip's appended words (Suggested changes v2's request box): selected for a beat, then the caret at the end. */
export type HighlightTail = { length: number; nonce: number };
/** How long an appended sentence stays selected before the caret moves past it (the Intake board's "for a beat"). */
export const HIGHLIGHT_MS = 900;

export function TuningNotesField({
  value,
  onChange,
  id = "tuning-notes-field",
  label = copy.label,
  placeholder,
  labelRow = false,
  fill = false,
  highlightTail = null,
}: {
  value: string;
  onChange: (next: string) => void;
  /** The textarea's id; two boxes on one page need two. */
  id?: string;
  /** The box's name: drawn as the label row's label when `labelRow`, else its accessible name alone. */
  label?: string;
  /** One placeholder at both widths; absent, the Additional notes pair. */
  placeholder?: string;
  /** Draw the visible label and the card-tag ⓘ tip above the frame, and let Escape clear the draft (Additional notes). */
  labelRow?: boolean;
  /** The frame fills its container's height (the box grows to the Bracket card's height on desktop). */
  fill?: boolean;
  /** Select the last `length` drawn characters for a beat, then put the caret at the end; each `nonce` once. */
  highlightTail?: HighlightTail | null;
}) {
  const desktop = useIsDesktop();
  const ref = useRef<HTMLTextAreaElement>(null);
  const { field, picker } = useTaggedField({ value, onChange, search: searchNotesCards, max: copy.maxLength, maxTags: NOTES_TAGS_MAX, field: ref });
  const n = picker.count;
  // Grows with its content (review fix) rather than sitting fixed at two rows: measured off the
  // textarea's own `scrollHeight`, which only reflects real layout in a browser — jsdom reports
  // 0, so this is a no-op there and the field keeps its CSS floor.
  // A `fill` box grows the same way, but as a FLOOR: it is measured at its own content height (out of the stretch) and
  // given that as its minimum, so the frame still stretches to the Bracket card beside it on desktop and grows past it,
  // never clipping, when the words run longer (500 characters on a phone has no card beside it at all).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (fill) {
      el.style.flex = "none";
      el.style.height = "auto";
      el.style.minHeight = "";
      const content = el.scrollHeight;
      el.style.flex = "";
      el.style.height = "";
      if (content > 0) el.style.minHeight = `${Math.max(FRAMED_MIN_PX, content)}px`;
      return;
    }
    el.style.height = "auto";
    const next = el.scrollHeight;
    if (next > 0) el.style.height = `${next}px`;
  }, [field.text, fill]);
  // The appended words, highlighted for a beat with the caret following them (Intake board C b). Run after the text the
  // tail belongs to is drawn: keyed on the nonce, read off the box as it stands.
  const shownTail = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !highlightTail || shownTail.current === highlightTail.nonce) return;
    shownTail.current = highlightTail.nonce;
    const end = el.value.length;
    el.focus({ preventScroll: true });
    el.setSelectionRange(Math.max(0, end - highlightTail.length), end);
    const settle = setTimeout(() => {
      if (document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length);
    }, HIGHLIGHT_MS);
    return () => clearTimeout(settle);
  }, [highlightTail, field.text]);
  const infoId = `${id}-info`;
  return (
    <div className={`relative flex flex-col ${labelRow ? "gap-[6px]" : ""} ${fill ? "h-full" : ""}`}>
      {labelRow ? (
        <div className="relative flex items-center gap-[8px]">
          <label htmlFor={id} className="block font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
            {label}
          </label>
          <InfoTip id={infoId} lines={copy.tagHelp.lines} label={copy.tagHelp.infoAria} className="self-center" />
        </div>
      ) : null}
      <TaggedBox onInsert={picker.insertTag} open={picker.open} count={n} max={copy.maxLength} className={fill ? "flex-1" : ""}>
        <textarea
          ref={ref}
          id={id}
          value={field.text}
          {...picker.fieldProps}
          onChange={(e) => picker.typed(e.target.value, e.target.selectionStart)}
          aria-describedby={labelRow ? infoId : undefined}
          onKeyDown={(e) => {
            // The picker owns its keys while it is open (Escape closes the list); what is left is ours.
            if (picker.onKeyDown(e)) return;
            // Escape cancels an IME composition candidate first; it must not also clear the draft in the same keystroke.
            if (e.nativeEvent.isComposing) return;
            // Only the labelled box clears on Escape; the request box keeps its words.
            if (!labelRow) return;
            // The help tip closes on the same Escape (InfoTip listens at the document, and focus stays here), so an
            // open tip takes it and the draft stays.
            if (e.key === "Escape" && !document.querySelector(`button[aria-describedby="${infoId}"][aria-expanded="true"]`)) onChange("");
          }}
          rows={3}
          placeholder={placeholder ?? (desktop ? copy.placeholder : copy.placeholderPhone)}
          aria-label={labelRow ? undefined : label}
          // 16px below `md`, same iOS Safari zoom-on-focus reason as the description field.
          className={`w-full resize-none overflow-hidden bg-transparent font-sans text-[16px] leading-[1.5] outline-none [@media(pointer:fine)]:md:text-[13.5px] ${fill ? "flex-1" : ""}`}
          style={{ padding: "10px 12px 4px", color: "var(--fg)", minHeight: FRAMED_MIN_PX }}
        />
      </TaggedBox>
      {picker.open && <CardTagList {...picker.list} />}
    </div>
  );
}
