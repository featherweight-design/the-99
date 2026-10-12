"use client";

import { AFFIX_FOCUS, AFFIX_INPUT } from "../../ui/text-field";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchNoteCards } from "../../../app/decks/notes-actions";
import { deckNotesCopy, NOTE_MAX, NOTE_WARN_AT } from "../../../lib/copy/deck-notes";
import { fieldCount, insertOpenTag, insertPick, openTagAt, type Picked } from "../../../lib/decks/notes-field";
import { PRIMARY } from "../../ui/button";
import { InfoTip } from "../../ui/info-tip";

/** A card the deck holds, for the picker's local "In this deck" group. */
export type DeckCardOption = { oracleId: string; name: string; typeLine: string; imageUri: string | null };

type Option = { oracleId: string; name: string; meta: string; group: "deck" | "any" };
/** The picker lookup's answer for ONE query; any other query reads as pending, so no effect has to reset it. */
type Answer = { query: string; status: "ok" | "refused"; rows: Option[] };

/** The picker's two groups show five rows each (the design table's `limits`). */
const GROUP_MAX = 5;
const REMOTE_MIN_LETTERS = 2;
const DEBOUNCE_MS = 150;

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
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const seq = useRef(0);
  // A field that unmounts while focused (a saved edit, a switched panel) must not leave the bars hidden.
  useEffect(() => () => document.documentElement.removeAttribute("data-note-focus"), []);

  const tag = !dismissed ? openTagAt(value, caret) : null;
  const open = tag !== null;
  const query = tag?.query.trim() ?? "";

  const local = useMemo<Option[]>(() => {
    if (!open || query.length === 0) return [];
    const q = query.toLowerCase();
    return deckCards
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name))
      .slice(0, GROUP_MAX)
      .map((c) => ({ oracleId: c.oracleId, name: c.name, meta: c.typeLine, group: "deck" as const }));
  }, [open, query, deckCards]);

  useEffect(() => {
    if (!open || query.length < REMOTE_MIN_LETTERS) return;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const hits = await searchNoteCards(query).catch(() => null);
      if (mine !== seq.current) return;
      if (hits === null) return setAnswer({ query, status: "refused", rows: [] });
      const held = new Set(deckCards.map((c) => c.oracleId));
      setAnswer({
        query,
        status: "ok",
        rows: hits
          .filter((h) => !held.has(h.oracleId))
          .slice(0, GROUP_MAX)
          .map((h) => ({
            oracleId: h.oracleId,
            name: h.name,
            meta: [h.typeLine, deckNotesCopy.picker.notInDeck, h.commanderLegal ? null : deckNotesCopy.picker.notLegal].filter(Boolean).join(" · "),
            group: "any" as const,
          })),
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, query, deckCards]);

  // Opening the picker brings the field to the top of the visible area (K9): the sticky add-card bar and a
  // phone keyboard would otherwise cover the list under it.
  useEffect(() => {
    if (open) input.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [open]);

  const lookup = open && query.length >= REMOTE_MIN_LETTERS;
  const current = lookup && answer?.query === query ? answer : null;
  const remoteStatus = !lookup ? "idle" : current ? current.status : "pending";
  const options = [...local, ...(current?.status === "ok" ? current.rows : [])];
  const count = fieldCount(value, picked);
  const showCounter = focused || value.length > 0;
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  // The whole-change cap, shared by typing and by every insert: a change that leaves the field over the cap
  // and longer than it was is refused whole, so a pick or the `[[ ]]` button cannot strand an unsubmittable value.
  const overCap = (text: string, next: Picked) => fieldCount(text, next) > NOTE_MAX && fieldCount(text, next) > count;

  const place = (text: string, at: number, nextPicked: Picked = picked) => {
    if (overCap(text, nextPicked)) return;
    onChange(text, nextPicked);
    setCaret(at);
    setDismissed(false);
    setActive(0);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(at, at);
    });
  };

  const pick = (o: Option) => {
    if (!tag) return;
    const next = insertPick(value, tag.start, caret, o.name);
    place(next.text, next.caret, new Map(picked).set(o.name.replace(/[\[\]|]/g, "").trim(), o.oracleId));
  };

  const sync = () => setCaret(input.current?.selectionStart ?? 0);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (open && options.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((activeIndex + 1) % options.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((activeIndex - 1 + options.length) % options.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(options[activeIndex]); return; }
    }
    if (e.key === "Escape") {
      if (open) { e.preventDefault(); setDismissed(true); return; }
      if (onCancel) { e.preventDefault(); onCancel(); }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      // The picker is open and has nothing to pick yet (a lookup still pending): Enter waits rather than
      // submitting the unfinished `[[query` as plain text.
      if (open) return;
      if (canSubmit) onSubmit();
    }
  };

  const canSubmit = !pending && !disabledSubmit && value.trim().length > 0 && count <= NOTE_MAX;
  const listId = `${id}-list`;
  const infoId = `${id}-info`;

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
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open && options.length > 0 ? `${id}-opt-${activeIndex}` : undefined}
            autoComplete="off"
            onFocus={() => { setFocused(true); sync(); document.documentElement.setAttribute("data-note-focus", ""); }}
            onBlur={() => { setFocused(false); document.documentElement.removeAttribute("data-note-focus"); }}
            onChange={(e) => {
              const text = e.target.value.replace(/\s+/g, " ");
              // The cap is on RENDERED text, so a longer paste is refused whole rather than cut mid-tag.
              if (overCap(text, picked)) return;
              onChange(text, picked);
              setCaret(e.target.selectionStart ?? text.length);
              setDismissed(false);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            onKeyUp={sync}
            onClick={sync}
            className={`box-border h-[46px] w-full scroll-mt-[96px] rounded-[8px] py-[10px] pl-[12px] pr-[43px] font-sans text-[16px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] md:h-[38px] md:py-[8px] md:pl-[11px] md:pr-[39px] md:text-[13.5px] ${AFFIX_INPUT}`}
          />
          <span className="absolute right-[13px] top-1/2 -translate-y-1/2 md:right-[11px]">
            <InfoTip id={infoId} lines={deckNotesCopy.help.lines} label={deckNotesCopy.help.infoAria} />
          </span>
          {open && (
            <div
              id={listId}
              role="listbox"
              aria-label={deckNotesCopy.picker.listAria}
              className="absolute left-0 top-full z-20 mt-[4px] max-h-[220px] w-full overflow-y-auto rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[4px] shadow-lg md:w-[440px] md:max-h-none"
            >
              {query.length === 0 ? (
                <p className="m-0 px-[12px] py-[8px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{deckNotesCopy.picker.empty}</p>
              ) : (
                <>
                  {local.length > 0 && <p className="m-0 px-[12px] pb-[2px] pt-[6px] font-mono text-[10px] uppercase text-[color:var(--fg-faint)]">{deckNotesCopy.picker.inDeck}</p>}
                  {local.length === 0 && query.length >= REMOTE_MIN_LETTERS && <p className="m-0 px-[12px] py-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{deckNotesCopy.picker.noneInDeck}</p>}
                  {options.map((o, i) => (
                    <div key={`${o.group}-${o.oracleId}`}>
                      {o.group === "any" && i === local.length && <p className="m-0 px-[12px] pb-[2px] pt-[6px] font-mono text-[10px] uppercase text-[color:var(--fg-faint)]">{deckNotesCopy.picker.anyCard}</p>}
                      <div
                        id={`${id}-opt-${i}`}
                        role="option"
                        aria-selected={i === activeIndex}
                        // mousedown, not click: the field must keep focus (a phone keyboard stays up).
                        onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                        className={`flex min-h-[48px] cursor-pointer flex-col justify-center px-[12px] py-[4px] md:min-h-0 ${i === activeIndex ? "bg-[color:var(--elevated)]" : ""}`}
                      >
                        <span className="font-sans text-[13px] text-[color:var(--fg)]">{o.name}</span>
                        <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{o.meta}</span>
                      </div>
                    </div>
                  ))}
                  {remoteStatus === "pending" && <p className="m-0 px-[12px] py-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{deckNotesCopy.picker.searching}</p>}
                  {remoteStatus === "refused" && <p className="m-0 px-[12px] py-[6px] font-mono text-[10.5px] text-[color:var(--warning)]">{deckNotesCopy.picker.refused}</p>}
                </>
              )}
              <p className="m-0 hidden px-[12px] pb-[4px] pt-[6px] font-mono text-[10px] text-[color:var(--fg-locked)] md:block">{deckNotesCopy.picker.keys}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-[8px]">
          {showCounter && (
            <span className={`mr-auto font-mono text-[10px] md:order-2 md:mr-0 md:ml-[4px] ${count >= NOTE_WARN_AT ? "text-[color:var(--warning)]" : "text-[color:var(--fg-locked)]"}`} aria-live="off">
              {deckNotesCopy.add.counter(String(count), String(NOTE_MAX))}
            </span>
          )}
          <button
            type="button"
            aria-label={deckNotesCopy.help.insertAria}
            // Keeps the caret and the keyboard where they are; the insert restores them itself.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const at = input.current?.selectionStart ?? value.length;
              const next = insertOpenTag(value, at);
              place(next.text, next.caret);
            }}
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
      {/* Always in the layout, only unseen until focus: removing it on blur shrank the page under a
          scrolled-to-the-end reader, moved the Add button between mousedown and mouseup, and lost the click. */}
      {hint && <p aria-hidden={!focused} className={`m-0 hidden font-mono text-[10.5px] text-[color:var(--fg-faint)] md:block ${focused ? "" : "invisible"}`}>{hint}</p>}
      {error && <p role="alert" className="m-0 text-[11.5px] leading-[1.45]" style={{ color: "var(--warning)" }}>{error}</p>}
    </div>
  );
}
