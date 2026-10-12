"use client";

import { useEffect, useRef, useState } from "react";
import { deleteNote, editNote, setNoteDone } from "../../../app/decks/notes-actions";
import { deckNotesCopy } from "../../../lib/copy/deck-notes";
import type { NoteView, NotesResult } from "../../../lib/decks/notes-types";
import { serialize, toField, type Picked } from "../../../lib/decks/notes-field";
import { DeleteConfirm } from "../../ui/delete-confirm";
import { MutationError } from "../mutation-error";
import { NoteField, type DeckCardOption } from "./note-field";
import { NoteTags } from "./note-tags";

/** `2 Oct`: absolute and mono, in the player's own calendar. Never relative (the Must-nots). */
export function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * One note. Open or done, the select box (a checkbox named `Done: {text}`), the text with its tags, the
 * absolute date, and edit and delete: two small buttons from `md:`, one `⋯` below it. Edit is in place and
 * the date stays the creation date. Delete is the shipped `DeleteConfirm`. Each write answers with the
 * shipped `MutationError` on a refusal and leaves the row as it was.
 */
export function NoteRow({
  note, deckId, deckCards, onAnnounce, onResult,
}: {
  note: NoteView;
  deckId: string;
  deckCards: readonly DeckCardOption[];
  onAnnounce: (message: string) => void;
  /** The fresh notes a successful write answered with, for the panel to show. */
  onResult: (result: NotesResult) => void;
}) {
  const done = note.doneAt !== null;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Picked>(new Map());
  const inFlight = useRef(false);
  const confirmPane = useRef<HTMLDivElement>(null);
  // The confirm opens under the row, which on a phone can be behind the fixed tab bar and the sticky add
  // bar. Bring it fully into view, clear of both (the bottom margin is their height plus a little air).
  useEffect(() => {
    if (confirming) confirmPane.current?.scrollIntoView?.({ block: "nearest" });
  }, [confirming]);
  const plain = note.drawn.map((s) => (s.kind === "text" ? s.text : s.name)).join("");

  const run = async (fn: () => Promise<NotesResult>, ok: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      onResult(r);
      if (r.ok) ok();
      else setError(r.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const toggleDone = () =>
    run(
      () => setNoteDone(deckId, note.id, !done),
      () => onAnnounce(done ? deckNotesCopy.announce.reopened : deckNotesCopy.announce.done),
    );

  const startEdit = () => {
    const f = toField(note.body);
    setText(f.text);
    setPicked(f.picked);
    setMenu(false);
    setError(null);
    setEditing(true);
  };

  const save = () =>
    run(
      () => editNote(deckId, note.id, serialize(text, picked).trim()),
      () => { setEditing(false); onAnnounce(deckNotesCopy.announce.saved); },
    );

  if (editing) {
    return (
      <li className="list-none rounded-[8px] border border-solid border-[color:var(--accent)] bg-[color:var(--surface-sunken)] p-[10px]">
        <NoteField
          value={text}
          picked={picked}
          deckCards={deckCards}
          pending={busy}
          submitLabel={deckNotesCopy.edit.save}
          pendingLabel={deckNotesCopy.edit.saving}
          placeholder=""
          ariaLabel={deckNotesCopy.row.edit}
          autoFocus
          onChange={(t, p) => { setText(t); setPicked(p); }}
          onSubmit={save}
          onCancel={() => { setEditing(false); setError(null); }}
          cancelLabel={deckNotesCopy.edit.cancel}
          hint={deckNotesCopy.edit.hint(formatNoteDate(note.createdAt))}
          error={error}
        />
      </li>
    );
  }

  return (
    <li className={`relative list-none rounded-[8px] border border-solid px-[10px] py-[9px] md:px-[12px] ${done ? "border-[color:var(--border)]" : "border-[color:var(--border-strong)]"}`}>
      <div className="flex items-start gap-[10px]">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={deckNotesCopy.row.doneAria(plain)}
          disabled={busy}
          onClick={toggleDone}
          className="mt-[1px] flex h-[22px] w-[22px] flex-none cursor-pointer items-center justify-center rounded-[5px] border border-solid border-[color:var(--border-strong)] bg-transparent p-0 text-[12px] md:h-[18px] md:w-[18px] data-[on=true]:bg-[color:var(--elevated)] data-[on=true]:text-[color:var(--fg-muted)]"
          data-on={done}
        >
          {done ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`m-0 break-words text-[13.5px] leading-[1.5] ${done ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg)]"}`}>
            <NoteTags drawn={note.drawn} faint={done} />
          </p>
          <span suppressHydrationWarning className="font-mono text-[10px] text-[color:var(--fg-locked)] md:hidden">
            {done ? deckNotesCopy.row.doneDate(formatNoteDate(note.doneAt!)) : formatNoteDate(note.createdAt)}
          </span>
        </div>
        <span suppressHydrationWarning className="hidden flex-none pt-[2px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:inline">
          {done ? deckNotesCopy.row.doneDate(formatNoteDate(note.doneAt!)) : formatNoteDate(note.createdAt)}
        </span>
        <span className="hidden flex-none gap-[2px] md:flex">
          <button type="button" aria-label={deckNotesCopy.row.edit} onClick={startEdit} className="h-[28px] w-[28px] cursor-pointer border-0 bg-transparent text-[14px] text-[color:var(--fg-locked)]">{"✎"}</button>
          <button type="button" aria-label={deckNotesCopy.row.delete} onClick={() => { setConfirming(true); setError(null); }} className="h-[28px] w-[28px] cursor-pointer border-0 bg-transparent text-[16px] text-[color:var(--fg-locked)]">{"×"}</button>
        </span>
        <button
          type="button"
          aria-label={deckNotesCopy.row.more}
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
          className="h-[44px] w-[44px] flex-none cursor-pointer border-0 bg-transparent text-[18px] text-[color:var(--fg-locked)] md:hidden"
        >
          {"⋯"}
        </button>
      </div>
      {menu && (
        // In the row's own flow, not hanging off it: a menu that overhangs the last row lands under the
        // sticky add bar, out of reach, and pushes nothing. Two 44px actions, phone only.
        <div className="mt-[6px] flex gap-[8px] md:hidden">
          <button type="button" onClick={startEdit} className="h-[44px] flex-1 cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] text-[14px] text-[color:var(--fg)]">{deckNotesCopy.row.menuEdit}</button>
          <button type="button" onClick={() => { setMenu(false); setConfirming(true); setError(null); }} className="h-[44px] flex-1 cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] text-[14px] text-[color:var(--fg)]">{deckNotesCopy.row.menuDelete}</button>
        </div>
      )}
      {confirming && (
        <div ref={confirmPane} className="mt-[8px] scroll-mb-[calc(var(--tabbar-h)+84px)] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] md:scroll-mb-[72px]">
          <DeleteConfirm
            heading={deckNotesCopy.confirm.heading}
            body={deckNotesCopy.confirm.body}
            cancelLabel={deckNotesCopy.confirm.no}
            confirmLabel={deckNotesCopy.confirm.yes}
            pendingLabel={deckNotesCopy.confirm.deleting}
            pending={busy}
            error={error}
            onCancel={() => { setConfirming(false); setError(null); }}
            onConfirm={() => run(() => deleteNote(deckId, note.id), () => { setConfirming(false); onAnnounce(deckNotesCopy.announce.deleted); })}
          />
        </div>
      )}
      {error && !confirming && <MutationError message={error} />}
    </li>
  );
}
