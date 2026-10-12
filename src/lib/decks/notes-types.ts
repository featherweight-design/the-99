/**
 * The shapes the Notes panel draws, and the one constant it needs: no database import, so a client
 * component can value-import this file (`notes-read.ts` reaches `src/db`, which must stay out of the browser).
 */

export type NoteDrawn =
  | { kind: "text"; text: string }
  | { kind: "tag"; oracleId: string; name: string; held: boolean; resolved: boolean; imageUri: string | null };

export type NoteView = {
  id: string;
  /** The stored body, for the edit field. */
  body: string;
  drawn: NoteDrawn[];
  createdAt: string;
  doneAt: string | null;
};

/**
 * `readAt` is when the server read them (ms since the epoch). The panel keeps the freshest view it has seen:
 * a write's action returns the view it just read, and a page payload that arrives LATER but was read earlier
 * (an older refresh landing after a newer action) is ignored by comparing this, instead of showing the notes
 * as they were before the write.
 */
export type DeckNotesView = { open: NoteView[]; done: NoteView[]; readAt: number };

/** A write's answer: the fresh notes it just read (null when that read failed, and the page payload carries them). */
export type NotesResult = { ok: true; notes: DeckNotesView | null } | { ok: false; message: string };

/** No read at all (the switch is off, or the payload carries none): older than any real one, so it never replaces one. */
export const NO_NOTES: DeckNotesView = { open: [], done: [], readAt: 0 };
