"use client";

import { useIsDesktop } from "../../ui/use-is-desktop";
import { useRef, useState } from "react";
import { addNote } from "../../../app/decks/notes-actions";
import { deckNotesCopy, NOTES_PER_DECK, NOTES_SHOWN } from "../../../lib/copy/deck-notes";
import type { DeckNotesView, NotesResult } from "../../../lib/decks/notes-types";
import { serialize, type Picked } from "../../../lib/decks/notes-field";
import { NoteField, type DeckCardOption } from "./note-field";
import { NoteRow } from "./note-row";
import { NotesMark } from "./notes-mark";
import { CHEVRON_CLASS } from "../../ui/chevron";

/**
 * The Notes view of Your deck (the third `DeckPanel` value). Top to bottom: the input, or the cap line at
 * 100 notes (open and done together); the open notes newest first, six and then `Show all N`; `Done (N)`,
 * closed by default on every visit. Empty is the Games tab's shape with the Notes mark. It reads from the
 * page's payload, so a write's revalidation redraws it; nothing here is optimistic.
 */
export function DeckNotesPanel({
  deckId, notes: fromPage, deckCards,
}: {
  deckId: string;
  notes: DeckNotesView;
  deckCards: readonly DeckCardOption[];
}) {
  // The freshest view seen, by when the server read it. A write's action returns the notes it just read, and
  // the page's own payload can land before OR after that: an older one (an earlier refresh arriving late)
  // must not put the notes back as they were. Adjusting state during render, so the older one never paints.
  const [notes, setNotes] = useState(fromPage);
  if (fromPage.readAt > notes.readAt) setNotes(fromPage);
  const adopt = (r: NotesResult) => {
    if (r.ok && r.notes) {
      const next = r.notes;
      setNotes((prev) => (next.readAt >= prev.readAt ? next : prev));
    }
  };
  const total = notes.open.length + notes.done.length;
  const atCap = total >= NOTES_PER_DECK;
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Picked>(new Map());
  const desktop = useIsDesktop();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [announce, setAnnounce] = useState("");
  const inFlight = useRef(false);
  // Every write this panel makes goes down ONE queue. Two writes in flight at once each answer with the notes
  // as THEY read them, and a read that began first can finish last, so the panel would show a state that
  // undoes the other write. One at a time, each answer follows the write before it.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const queued = useRef(0);
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    // Starts at once when nothing is ahead of it; waits its turn otherwise.
    const next = queued.current === 0 ? fn() : chain.current.then(fn, fn);
    queued.current += 1;
    chain.current = next.then(() => undefined, () => undefined).then(() => { queued.current -= 1; });
    return next;
  };

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      // Trimmed on save (A4): a pick leaves a trailing space.
      const r = await enqueue(() => addNote(deckId, serialize(text, picked).trim()));
      adopt(r);
      if (r.ok) {
        setText("");
        setPicked(new Map());
        setAnnounce(deckNotesCopy.announce.added);
      } else {
        setError(r.message);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const composer = atCap ? (
    <div className="rounded-[8px] border border-dashed border-[color:var(--border-strong)] px-[14px] py-[12px]">
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{deckNotesCopy.add.atCap}</p>
      <p className="m-0 mt-[4px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{deckNotesCopy.add.atCapNote}</p>
    </div>
  ) : (
    <NoteField
      value={text}
      picked={picked}
      deckCards={deckCards}
      pending={busy}
      submitLabel={deckNotesCopy.add.add}
      pendingLabel={deckNotesCopy.add.adding}
      placeholder={desktop ? deckNotesCopy.add.placeholder : deckNotesCopy.add.placeholderShort}
      ariaLabel={deckNotesCopy.add.label}
      onChange={(t, p) => { setText(t); setPicked(p); setError(null); }}
      onSubmit={submit}
      hint={deckNotesCopy.add.hintTyping(today)}
      error={error}
    />
  );

  const live = (
    <p role="status" aria-live="polite" className="sr-only">{announce}</p>
  );
  const row = (n: DeckNotesView["open"][number]) => (
    <NoteRow key={n.id} note={n} deckId={deckId} deckCards={deckCards} onAnnounce={setAnnounce} onResult={adopt} enqueue={enqueue} />
  );

  if (total === 0) {
    return (
      <section aria-label={deckNotesCopy.head.segment} className="flex flex-col gap-[18px] px-[16px] pb-[24px] pt-[18px] md:mx-auto md:w-full md:max-w-[820px] md:flex-row md:gap-[30px] md:px-[28px] md:py-[18px]">
        <div className="flex justify-center md:flex-none md:items-start"><span className="md:hidden"><NotesMark size={64} /></span><span className="hidden md:block"><NotesMark size={100} /></span></div>
        <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
          <h2 className="m-0 font-display text-[20px] text-[color:var(--fg)]">{deckNotesCopy.empty.heading}</h2>
          <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{deckNotesCopy.empty.body}</p>
          {composer}
        </div>
        {live}
      </section>
    );
  }

  const openRows = showAllOpen ? notes.open : notes.open.slice(0, NOTES_SHOWN);
  const doneRows = showAllDone ? notes.done : notes.done.slice(0, NOTES_SHOWN);
  return (
    <section aria-label={deckNotesCopy.head.segment} className="flex flex-col gap-[8px] px-[16px] pb-[24px] pt-[16px] md:mx-auto md:w-full md:max-w-[820px] md:gap-[6px] md:px-[28px] md:pb-[28px] md:pt-[10px]">
      {composer}
      {notes.open.length > 0 && <ul className="m-0 flex flex-col gap-[6px] p-0">{openRows.map(row)}</ul>}
      {notes.open.length > NOTES_SHOWN && !showAllOpen && (
        <button type="button" onClick={() => setShowAllOpen(true)} className="min-h-[44px] cursor-pointer self-start border-0 bg-transparent p-0 font-mono text-[11px] text-[color:var(--fg-muted)] md:min-h-0">
          {deckNotesCopy.more.open(String(notes.open.length))}
        </button>
      )}
      {notes.done.length > 0 && (
        <div className="mt-[6px] flex flex-col gap-[6px]">
          <button
            type="button"
            aria-expanded={doneOpen}
            onClick={() => setDoneOpen((o) => !o)}
            className="min-h-[44px] cursor-pointer self-start border-0 bg-transparent p-0 font-mono text-[11px] text-[color:var(--fg-muted)] md:min-h-[32px]"
          >
            <span aria-hidden="true" className={CHEVRON_CLASS}>{doneOpen ? "▾" : "▸"}</span> {deckNotesCopy.done.toggle(String(notes.done.length))}
          </button>
          {doneOpen && <ul className="m-0 flex flex-col gap-[6px] p-0">{doneRows.map(row)}</ul>}
          {doneOpen && notes.done.length > NOTES_SHOWN && !showAllDone && (
            <button type="button" onClick={() => setShowAllDone(true)} className="min-h-[44px] cursor-pointer self-start border-0 bg-transparent p-0 font-mono text-[11px] text-[color:var(--fg-muted)] md:min-h-0">
              {deckNotesCopy.more.done(String(notes.done.length))}
            </button>
          )}
        </div>
      )}
      {live}
    </section>
  );
}

