"use client";

import { useEffect, useRef } from "react";
import { searchNoteCards } from "../../../app/decks/notes-actions";
import { deckNotesCopy, NOTE_MAX, NOTE_WARN_AT } from "../../../lib/copy/deck-notes";
import type { Picked } from "../../../lib/decks/notes-field";
import { TaggedBox } from "../../cards/tagged-box";
import { CardTagList, useCardTagPicker, type DeckCardOption } from "../../cards/card-tag-picker";
import { PRIMARY } from "../../ui/button";
import { InfoTip } from "../../ui/info-tip";

export type { DeckCardOption };

/** The shared one-line field: the add input and the edit input. It owns the `[[` picker and the ⓘ; the key, its words and the counter are the TaggedBox foot. */
export function NoteField({
  value, picked, deckCards, pending, submitLabel, pendingLabel, placeholder, ariaLabel, autoFocus = false,
  onChange, onSubmit, onCancel, cancelLabel, hint, error, disabledSubmit = false,
}: {
  value: string;
  picked: Picked;
  deckCards: readonly DeckCardOption[];
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  onChange: (text: string, picked: Picked) => void;
  onSubmit: () => void;
  /** Present in edit: Esc and the Cancel button call it. */
  onCancel?: () => void;
  cancelLabel?: string;
  hint?: string;
  error?: string | null;
  disabledSubmit?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  // A field that unmounts while focused (a saved edit, a switched panel) must not leave the bars hidden.
  useEffect(() => () => document.documentElement.removeAttribute("data-note-focus"), []);

  // A note is one line: every run of whitespace folds to one space as it is typed.
  const picker = useCardTagPicker({
    value, picked, onChange, search: searchNoteCards, deckCards, max: NOTE_MAX, field: input,
    normalize: (text) => text.replace(/\s+/g, " "),
  });
  const { open, count } = picker;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const handled = picker.onKeyDown(e);
    if (handled) return;
    if (e.key === "Escape") {
      if (onCancel) { e.preventDefault(); onCancel(); }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  const canSubmit = !pending && !disabledSubmit && value.trim().length > 0 && count <= NOTE_MAX;
  const infoId = `${picker.id}-info`;
  const counterId = `${picker.id}-count`;

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Phone: the frame, then the action row on its own line, right-aligned. Desktop: the frame beside Add, top-aligned
          (the frame is taller than Add, so Add sits at the line's top, not centered on the foot). */}
      <div className="flex flex-col gap-[8px] md:flex-row md:items-start">
        <div className="relative min-w-0 flex-1">
          <TaggedBox
            fill="sunken"
            onInsert={picker.insertTag}
            open={open}
            count={count}
            max={NOTE_MAX}
            counterId={counterId}
            warnAt={NOTE_WARN_AT}
            className="relative"
          >
            <input
              ref={input}
              type="text"
              value={value}
              autoFocus={autoFocus}
              disabled={pending}
              placeholder={placeholder}
              aria-label={ariaLabel}
              aria-describedby={`${infoId} ${counterId}`}
              {...picker.fieldProps}
              onFocus={() => { picker.fieldProps.onFocus(); document.documentElement.setAttribute("data-note-focus", ""); }}
              onBlur={() => { document.documentElement.removeAttribute("data-note-focus"); }}
              onChange={(e) => picker.typed(e.target.value, e.target.selectionStart)}
              onKeyDown={onKeyDown}
              // One line: nowrap with an ellipsis, 9 12 3 padding, min-height 1.5em + 12px (Tag-Places board c); the right
              // padding clears the ⓘ.
              className="box-border min-h-[calc(1.5em+12px)] w-full min-w-0 scroll-mt-[96px] truncate border-0 bg-transparent pt-[9px] pb-[3px] pl-[12px] pr-[38px] font-sans text-[16px] leading-[1.5] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-placeholder)] [@media(pointer:fine)]:md:text-[13.5px]"
            />
            {/* The tip anchors to the frame, so on a phone it spans the frame instead of the ⓘ's own box. */}
            <InfoTip
              id={infoId}
              lines={deckNotesCopy.help.lines}
              label={deckNotesCopy.help.infoAria}
              className="contents"
              phoneAbove
              buttonClassName="absolute right-[11px] top-[9px]"
            />
          </TaggedBox>
          {open && <CardTagList {...picker.list} />}
        </div>
        <div className="flex items-center justify-end gap-[8px]">
          {onCancel && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onCancel} className="h-[48px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-sans text-[14px] text-[color:var(--fg-muted)] md:h-[40px] md:text-[13px]">
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            // Pressing Add must not blur the field: on a phone the bars the focus hid would come back and
            // shift the page under the finger, and the keyboard would drop for a note about to be added.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSubmit}
            className={`h-[48px] min-w-[104px] cursor-pointer rounded-[8px] px-[16px] text-[14px] font-semibold disabled:cursor-default disabled:opacity-40 md:h-[40px] md:min-w-0 md:text-[13px] ${PRIMARY}`}
          >
            {pending ? pendingLabel : submitLabel}
          </button>
        </div>
      </div>
      {/* Always drawn (Hugh, 2026-10-12): shown only on focus it popped in under the field and moved what was
          below it, and removing it on blur shrank the page under a scrolled-to-the-end reader, moved the Add
          button between mousedown and mouseup, and lost the click. */}
      {hint && <p className="m-0 hidden font-mono text-[10.5px] text-[color:var(--fg-faint)] md:block">{hint}</p>}
      {error && <p role="alert" className="m-0 text-[11.5px] leading-[1.45]" style={{ color: "var(--warning)" }}>{error}</p>}
    </div>
  );
}
