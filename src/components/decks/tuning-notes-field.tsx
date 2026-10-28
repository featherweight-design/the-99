"use client";

// "Additional notes" (H35, STATES-deck-description.md §3 states 1/3, PR 3): one note per press,
// held in the panel's own state and never saved anywhere — it rides into the next run's prompt
// (PR 4b, `tuning-actions.ts`'s `runTuning`) and is gone once that run lands.
//
// It takes the Notes `[[` card tag (card-tags plan, PR 2). The panel's value is the BODY, with a tag as
// `[[id|Name]]`; the box shows the name, and the server resolves each tag to the catalog's name before
// the words reach the prompt.

import { useEffect, useRef } from "react";
import { searchTagCards } from "../../app/cards/tag-actions";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { NOTES_TAGS_MAX } from "../../lib/tuning/limits";
import { CardTagList } from "../cards/card-tag-picker";
import { useTaggedField } from "../cards/use-tagged-field";
import { TagHelpRow } from "../cards/tag-help-row";
import { useIsDesktop } from "../ui/use-is-desktop";

const copy = deckDescriptionCopy.notes;
/** Two rows' worth at this field's own line-height/padding — the review-specified starting
 *  height, and the floor `GROW_MIN_PX` keeps it from shrinking under its own placeholder. */
const GROW_MIN_PX = 64;
/** The framed request box's floor while it grows to its content; `rows={3}` already sizes the box above it. */
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
  tagHelp,
  framed = false,
  fill = false,
  highlightTail = null,
}: {
  value: string;
  onChange: (next: string) => void;
  /** The textarea's id; two boxes on one page need two. */
  id?: string;
  /** The box's name. Drawn as the label row's label, or (framed) as the box's accessible name alone. */
  label?: string;
  /** One placeholder at both widths; absent, the Additional notes pair. */
  placeholder?: string;
  /** Framed only: the words beside the `[[ ]]` button inside the box's foot. */
  tagHelp?: string;
  /** Suggested changes v2's request box (Intake board): one frame holding the text, with the `[[ ]]` button and the
   *  counter in its foot, and no label row (the step's own heading names it). */
  framed?: boolean;
  /** Framed only: the frame fills its container's height (the box grows to the Bracket card's height on desktop). */
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
  const textarea = (
    <textarea
      ref={ref}
      id={id}
      value={field.text}
      {...picker.fieldProps}
      aria-describedby={framed ? undefined : infoId}
      onChange={(e) => picker.typed(e.target.value, e.target.selectionStart)}
      onKeyDown={(e) => {
        // The picker owns its keys while it is open (Escape closes the list); what is left is ours.
        if (picker.onKeyDown(e)) return;
        // Escape cancels an IME composition candidate first, same as the deck header's own
        // description editor — without this guard, Escape during Japanese/Chinese/Korean
        // input clears the whole draft instead (review round 2).
        if (e.nativeEvent.isComposing) return;
        // The request box keeps its words on Escape: chips have written into it, and an Escape meant for a tip or a
        // list must never empty a request the press would send.
        if (framed) return;
        // Esc clears the draft rather than committing it — there is nothing server-side to
        // cancel (this field is never saved), so a reset to empty is the whole of "Cancel".
        // The help tip closes on the same Escape (InfoTip listens at the document, and focus stays here), so
        // an open tip takes it and the draft stays.
        if (e.key === "Escape" && !document.querySelector(`button[aria-describedby="${infoId}"][aria-expanded="true"]`)) onChange("");
      }}
      rows={framed ? 3 : 2}
      placeholder={placeholder ?? (desktop ? copy.placeholder : copy.placeholderPhone)}
      aria-label={label}
      // 16px below `md`, same iOS Safari zoom-on-focus reason as the description field.
      className={`w-full resize-none overflow-hidden font-sans text-[16px] leading-[1.5] [@media(pointer:fine)]:md:text-[13.5px] ${framed ? `bg-transparent outline-none ${fill ? "flex-1" : ""}` : "rounded-[8px]"}`}
      style={framed
        ? { padding: "10px 12px 4px", color: "var(--fg)", minHeight: FRAMED_MIN_PX }
        : {
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          padding: "10px 12px",
          color: "var(--fg)",
          minHeight: GROW_MIN_PX,
        }}
    />
  );
  if (framed) {
    return (
      <div className={`relative flex flex-col ${fill ? "h-full" : ""}`}>
        {/* The frame's border is a class, never inline, so the focus edge can take it (an inline border outranks it). */}
        <div
          data-framed-box=""
          className={`flex flex-col rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] focus-within:border-[color:var(--accent)] ${fill ? "flex-1" : ""}`}
        >
          {textarea}
          <span className="flex items-center gap-[8px] px-[12px] pt-[2px] pb-[8px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
            <button
              type="button"
              aria-label={copy.tagHelp.insertAria}
              onMouseDown={(e) => e.preventDefault()}
              onClick={picker.insertTag}
              className="h-[24px] cursor-pointer rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[8px] font-mono text-[11px] text-[color:var(--fg-muted)] pointer-coarse:h-[44px]"
            >
              {copy.tagHelp.insert}
            </button>
            {tagHelp ? <span aria-hidden="true">{tagHelp}</span> : null}
            <span className="ml-auto">{copy.counter(n, copy.maxLength)}</span>
          </span>
        </div>
        {picker.open && <CardTagList {...picker.list} />}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[6px]">
      <TagHelpRow htmlFor={id} label={label} infoId={infoId} help={copy.tagHelp} onInsert={picker.insertTag} />
      <div className="relative">
        {textarea}
        {picker.open && <CardTagList {...picker.list} />}
      </div>
      <span className="self-end font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
        {copy.counter(n, copy.maxLength)}
      </span>
    </div>
  );
}
