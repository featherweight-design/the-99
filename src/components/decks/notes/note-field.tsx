"use client";

import { AFFIX_FOCUS, AFFIX_INPUT } from "../../ui/text-field";
import { useEffect, useRef } from "react";
import { searchNoteCards } from "../../../app/decks/notes-actions";
import { deckNotesCopy, NOTE_MAX, NOTE_WARN_AT } from "../../../lib/copy/deck-notes";
import type { Picked } from "../../../lib/decks/notes-field";
import { CardTagList, useCardTagPicker, type DeckCardOption } from "../../cards/card-tag-picker";
import { PRIMARY } from "../../ui/button";
import { InfoTip } from "../../ui/info-tip";

export type { DeckCardOption };

/** The shared one-line field: the add input and the edit input. It owns the `[[` picker, the counter and the ⓘ. */
export function NoteField({
  value, picked, deckCards, pending, submitLabel, pendingLabel, placeholder, ariaLabel, autoFocus = false,
  onChange, onSubmit, onCancel, cancelLabel, hint, error, disabledSubmit = false, phoneRow = true,
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
  phoneRow?: boolean;
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

  return (
    <div className="flex flex-col gap-[8px]">
      <div className={`flex ${phoneRow ? "flex-col md:flex-row" : "flex-row"} gap-[8px]`}>
        <div className={`relative min-w-0 flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] ${AFFIX_FOCUS}`}>
          <input
            ref={input}
            type="text"
            value={value}
            autoFocus={autoFocus}
            disabled={pending}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-describedby={infoId}
            {...picker.fieldProps}
            onFocus={() => { picker.fieldProps.onFocus(); document.documentElement.setAttribute("data-note-focus", ""); }}
            onBlur={() => { document.documentElement.removeAttribute("data-note-focus"); }}
            onChange={(e) => picker.typed(e.target.value, e.target.selectionStart)}
            onKeyDown={onKeyDown}
            className={`box-border h-[46px] w-full scroll-mt-[96px] rounded-[8px] py-[10px] pl-[12px] pr-[43px] font-sans text-[16px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-placeholder)] md:h-[38px] md:py-[8px] md:pl-[11px] md:pr-[39px] md:text-[13.5px] ${AFFIX_INPUT}`}
          />
          {/* The tip anchors to this field, so on a phone it spans the field instead of the ⓘ's own box. */}
          <InfoTip
            id={infoId}
            lines={deckNotesCopy.help.lines}
            label={deckNotesCopy.help.infoAria}
            className="contents"
            phoneAbove
            buttonClassName="absolute right-[13px] top-1/2 -translate-y-1/2 md:right-[11px]"
          />
          {open && <CardTagList {...picker.list} />}
        </div>
        <div className="flex items-center justify-end gap-[8px]">
          {/* Always drawn, at a fixed desktop width (Hugh, 2026-10-12): drawn only on focus it widened this
              column and shrank the field beside it, and a count growing from `9 / 140` to `140 / 140` would
              have done the same as the player typed. */}
          <span
            className={`mr-auto font-mono text-[10px] tabular-nums md:order-2 md:mr-0 md:ml-[4px] md:w-[68px] md:text-right ${count >= NOTE_WARN_AT ? "text-[color:var(--warning)]" : "text-[color:var(--fg-locked)]"}`}
            aria-live="off"
          >
            {deckNotesCopy.add.counter(String(count), String(NOTE_MAX))}
          </span>
          <button
            type="button"
            aria-label={deckNotesCopy.help.insertAria}
            // Keeps the caret and the keyboard where they are; the insert restores them itself.
            onMouseDown={(e) => e.preventDefault()}
            onClick={picker.insertTag}
            className={`h-[48px] w-[56px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] font-mono text-[12px] md:h-[40px] md:w-[44px] ${open ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "bg-transparent text-[color:var(--fg-muted)]"}`}
          >
            {deckNotesCopy.help.insert}
          </button>
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
