"use client";

// The `[[` card-tag picker, shared (Notes, and every box that can name a card). It was inside Notes'
// one-line field; this is that logic and that dropdown lifted out so a textarea can use them without a
// second copy. The text rules (what opens the picker, what a pick writes, which `[[Name]]` count as
// tags) are `lib/decks/notes-field.ts`, unchanged.

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { deckNotesCopy } from "../../lib/copy/deck-notes";
import { fieldCount, fieldText, insertOpenTag, taggedCount, insertPick, openTagAt, type Picked } from "../../lib/decks/notes-field";
import type { NoteCardHit } from "../../lib/decks/notes-store";
import { reveal } from "../../lib/ui/reveal";

/** A card the surface holds, for the picker's local "In this deck" group. */
export type DeckCardOption = { oracleId: string; name: string; typeLine: string; imageUri: string | null };

type Option = { oracleId: string; name: string; meta: string; group: "deck" | "any" };
/** The picker lookup's answer for ONE query; any other query reads as pending, so no effect has to reset it. */
type Answer = { query: string; status: "ok" | "refused"; rows: Option[] };

/** The picker's two groups show five rows each (the design table's `limits`). */
const GROUP_MAX = 5;
const REMOTE_MIN_LETTERS = 2;
const DEBOUNCE_MS = 150;

export type CardTagPickerOptions = {
  value: string;
  picked: Picked;
  onChange: (text: string, picked: Picked) => void;
  /** The "any card" lookup; null is a refusal. */
  search: (query: string) => Promise<NoteCardHit[] | null>;
  /** The cards the surface holds (a deck's), drawn first. Omitted, there is no "In this deck" group. */
  deckCards?: readonly DeckCardOption[];
  /** The cap on the field's RENDERED text (a tag counts as its name). */
  max: number;
  /** How the cap counts rendered text; the default is characters (code points). */
  measure?: (text: string) => number;
  /** The most tags the field may hold; a pick past it is not made. */
  maxTags?: number;
  /** Applied to typed text before it is kept (Notes folds whitespace; a textarea keeps its lines). */
  normalize?: (text: string) => string;
  /** The element the picker is attached to. */
  field: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
};

/**
 * The picker's state and handlers. The caller draws the field and spreads `fieldProps` on it, draws
 * `<CardTagList {...list} />` where the dropdown goes, and calls `insertTag()` from its `[[ ]]` button.
 */
export function useCardTagPicker(o: CardTagPickerOptions) {
  const { value, picked, onChange, search, deckCards, max, normalize, field, maxTags } = o;
  const measure = o.measure;
  const id = useId();
  const [caret, setCaret] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const seq = useRef(0);

  const tag = !dismissed ? openTagAt(value, caret) : null;
  const open = tag !== null;
  const query = tag?.query.trim() ?? "";
  const scoped = deckCards !== undefined;

  const local = useMemo<Option[]>(() => {
    if (!open || query.length === 0 || !deckCards) return [];
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
      const hits = await search(query).catch(() => null);
      if (mine !== seq.current) return;
      if (hits === null) return setAnswer({ query, status: "refused", rows: [] });
      const held = new Set((deckCards ?? []).map((c) => c.oracleId));
      setAnswer({
        query,
        status: "ok",
        rows: hits
          .filter((h) => !held.has(h.oracleId))
          .slice(0, GROUP_MAX)
          .map((h) => ({
            oracleId: h.oracleId,
            name: h.name,
            meta: [h.typeLine, scoped ? deckNotesCopy.picker.notInDeck : null, h.commanderLegal ? null : deckNotesCopy.picker.notLegal].filter(Boolean).join(" · "),
            group: "any" as const,
          })),
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, query, deckCards, search, scoped]);

  // Opening the picker brings the field to the top of the visible area (K9): a sticky bar and a phone
  // keyboard would otherwise cover the list under it.
  useEffect(() => {
    if (open) reveal(field.current, "start");
  }, [open, field]);

  const lookup = open && query.length >= REMOTE_MIN_LETTERS;
  const current = lookup && answer?.query === query ? answer : null;
  const remoteStatus: "idle" | "pending" | "ok" | "refused" = !lookup ? "idle" : current ? current.status : "pending";
  const options = [...local, ...(current?.status === "ok" ? current.rows : [])];
  const sizeOf = (text: string, p: Picked) => (measure ? measure(fieldText(text, p)) : fieldCount(text, p));
  const count = sizeOf(value, picked);
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  // The whole-change cap, shared by typing and by every insert: a change that leaves the field over the cap
  // and longer than it was is refused whole, so a pick or the `[[ ]]` button cannot strand an unsubmittable value.
  const overCap = (text: string, next: Picked) => sizeOf(text, next) > max && sizeOf(text, next) > count;

  const place = (text: string, at: number, nextPicked: Picked = picked) => {
    if (overCap(text, nextPicked)) return;
    onChange(text, nextPicked);
    setCaret(at);
    setDismissed(false);
    setActive(0);
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(at, at);
    });
  };

  const atTagLimit = () => maxTags !== undefined && taggedCount(value, picked) >= maxTags;
  const pick = (opt: Option) => {
    if (!tag) return;
    // Tags held now: the marked `[[Name]]` the picked map still names.
    if (atTagLimit()) { setDismissed(true); return; }
    const next = insertPick(value, tag.start, caret, opt.name);
    place(next.text, next.caret, new Map(picked).set(opt.name.replace(/[\[\]|]/g, "").trim(), opt.oracleId));
  };

  const sync = () => setCaret(field.current?.selectionStart ?? 0);

  /**
   * Keys the picker owns while it is open with something to pick. Returns true when it handled the key;
   * what is left (Enter to submit, Escape to cancel) is the caller's. `closeOnEscape` reports whether
   * Escape just closed the list.
   */
  const onKeyDown = (e: KeyboardEvent<HTMLElement>): "handled" | "open-waiting" | "escape-closed" | null => {
    if (e.nativeEvent.isComposing) return "handled";
    if (open && options.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((activeIndex + 1) % options.length); return "handled"; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((activeIndex - 1 + options.length) % options.length); return "handled"; }
      // At the tag limit a pick does nothing, so Tab must not be held back: it closes the list and moves on.
      if (e.key === "Tab" && atTagLimit()) { setDismissed(true); return null; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(options[activeIndex]); return "handled"; }
    }
    if (e.key === "Escape" && open) { e.preventDefault(); setDismissed(true); return "escape-closed"; }
    // Open with nothing to pick yet (a lookup pending): Enter waits rather than submitting an unfinished `[[query`.
    if (e.key === "Enter" && open) { e.preventDefault(); return "open-waiting"; }
    return null;
  };

  const listId = `${id}-list`;
  return {
    open, options, count, activeIndex, remoteStatus, local, query,
    id,
    insertTag: () => {
      const at = field.current?.selectionStart ?? value.length;
      const next = insertOpenTag(value, at);
      place(next.text, next.caret);
    },
    /** What the field's own `onChange` calls with the text it now holds and its caret. */
    typed: (raw: string, caretAt: number | null) => {
      const text = normalize ? normalize(raw) : raw;
      // The cap is on RENDERED text, so a longer paste is refused whole rather than cut mid-tag.
      if (overCap(text, picked)) return;
      onChange(text, picked);
      setCaret(caretAt ?? text.length);
      setDismissed(false);
      setActive(0);
    },
    onKeyDown,
    fieldProps: {
      role: "combobox" as const,
      "aria-expanded": open,
      "aria-controls": open ? listId : undefined,
      "aria-activedescendant": open && options.length > 0 ? `${id}-opt-${activeIndex}` : undefined,
      autoComplete: "off",
      onKeyUp: sync,
      onClick: sync,
      onFocus: sync,
    },
    list: { id, listId, open, query, local, options, activeIndex, remoteStatus, scoped, pick },
  };
}

/** The dropdown, under its container's field, or above it when `placement` says there is no room below. `maxHeightPx` holds it to the room the caller measured (it scrolls inside). */
export function CardTagList({
  id, listId, query, local, options, activeIndex, remoteStatus, scoped, pick, maxHeightPx, placement = "below",
}: {
  id: string;
  listId: string;
  open: boolean;
  query: string;
  local: Option[];
  options: Option[];
  activeIndex: number;
  remoteStatus: "idle" | "pending" | "ok" | "refused";
  scoped: boolean;
  pick: (o: Option) => void;
  maxHeightPx?: number;
  placement?: "below" | "above";
}): ReactNode {
  const p = deckNotesCopy.picker;
  return (
    <div
      id={listId}
      role="listbox"
      aria-label={p.listAria}
      className={`absolute left-0 z-20 w-full overflow-y-auto rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[4px] shadow-lg max-h-[220px] md:w-[440px] md:max-h-none ${placement === "above" ? "bottom-full mb-[4px]" : "top-full mt-[4px]"}`}
      style={maxHeightPx === undefined ? undefined : { maxHeight: maxHeightPx }}
    >
      {query.length === 0 ? (
        <p className="m-0 px-[12px] py-[8px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{scoped ? p.empty : p.emptyAny}</p>
      ) : (
        <>
          {local.length > 0 && <p className="m-0 px-[12px] pb-[2px] pt-[6px] font-mono text-[10px] uppercase text-[color:var(--fg-faint)]">{p.inDeck}</p>}
          {scoped && local.length === 0 && query.length >= REMOTE_MIN_LETTERS && <p className="m-0 px-[12px] py-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{p.noneInDeck}</p>}
          {options.map((o, i) => (
            <div key={`${o.group}-${o.oracleId}`}>
              {o.group === "any" && i === local.length && scoped && <p className="m-0 px-[12px] pb-[2px] pt-[6px] font-mono text-[10px] uppercase text-[color:var(--fg-faint)]">{p.anyCard}</p>}
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
          {remoteStatus === "pending" && <p className="m-0 px-[12px] py-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{p.searching}</p>}
          {!scoped && remoteStatus === "ok" && options.length === 0 && <p className="m-0 px-[12px] py-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{p.noCard}</p>}
          {remoteStatus === "refused" && <p className="m-0 px-[12px] py-[6px] font-mono text-[10.5px] text-[color:var(--warning)]">{p.refused}</p>}
        </>
      )}
      <p className="m-0 hidden px-[12px] pb-[4px] pt-[6px] font-mono text-[10px] text-[color:var(--fg-locked)] md:block">{p.keys}</p>
    </div>
  );
}
