"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { requireDeck } from "../../lib/decks/read";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { type DeckMutationResult } from "../../lib/decks/mutation-result";
import { deckNotesEnabled } from "../../lib/decks/notes-flag";
import { checkBody, tagIds, withCurrentNames } from "../../lib/decks/notes-body";
import {
  currentNames, insertNote, removeNote, searchNoteCards as searchNoteCardsIn, setNoteDone as setDone, updateNoteBody,
  type NoteCardHit,
} from "../../lib/decks/notes-store";
import { deckNotesCopy } from "../../lib/copy/deck-notes";

// The four acts on a deck's notes, and the picker's lookup. Each is a public endpoint, so every argument is
// checked at runtime (the declared types are claims about the caller), the flag is checked first (a
// deployment without `DECK_NOTES_ENABLED` answers nothing), the session decides the reader, and the deck is
// loaded through `requireDeck` before anything is written.
//
// A write revalidates `deckSurfaces`. Notes sit in neither of the deck page's two cached reads
// (`loadDeckSuggestions`, `readSynergyCards`) and in no list-stamp table, so nothing cached needs retiring.

const surfaces = (deckId: string) => {
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
};

/**
 * Check the text and make every tag honest: each tagged id must be a real card, and its stored name is
 * rewritten to the catalog's name at this moment (lock 2), so a client cannot store a name that is not the
 * card's. A tag naming no card refuses the whole note rather than storing a link that opens nothing.
 */
async function prepareBody(raw: unknown): Promise<string | null> {
  const checked = checkBody(raw);
  if (!checked.ok) return null;
  const ids = tagIds(checked.body);
  const names = await currentNames(ids);
  if (ids.some((id) => !names.has(id))) return null;
  const body = withCurrentNames(checked.body, names);
  // A rewritten name can differ in length from the one the player saw, so the cap is checked once more.
  const again = checkBody(body);
  return again.ok ? again.body : null;
}

export async function addNote(deckId: string, rawBody: string): Promise<DeckMutationResult> {
  const refuse = { ok: false as const, message: deckNotesCopy.add.refused };
  if (!deckNotesEnabled()) return refuse;
  const userId = await requireUserId();
  if (!isUuid(deckId)) return refuse;
  await requireDeck(deckId, userId);
  try {
    const body = await prepareBody(rawBody);
    if (body === null) return refuse;
    if ((await insertNote(deckId, userId, body)) === "cap") {
      return { ok: false, message: deckNotesCopy.add.atCapRefused };
    }
  } catch (err) {
    console.error("addNote failed", err);
    return refuse;
  }
  surfaces(deckId);
  return { ok: true };
}

export async function editNote(deckId: string, noteId: string, rawBody: string): Promise<DeckMutationResult> {
  const refuse = { ok: false as const, message: deckNotesCopy.edit.refused };
  if (!deckNotesEnabled()) return refuse;
  const userId = await requireUserId();
  if (!isUuid(deckId) || !isUuid(noteId)) return refuse;
  await requireDeck(deckId, userId);
  try {
    const body = await prepareBody(rawBody);
    if (body === null) return refuse;
    if (!(await updateNoteBody(deckId, userId, noteId, body))) return refuse;
  } catch (err) {
    console.error("editNote failed", err);
    return refuse;
  }
  surfaces(deckId);
  return { ok: true };
}

/** Select (`done: true`) or unselect a note. */
export async function setNoteDone(deckId: string, noteId: string, done: boolean): Promise<DeckMutationResult> {
  const refuse = { ok: false as const, message: done === true ? deckNotesCopy.row.doneRefused : deckNotesCopy.row.reopenRefused };
  if (!deckNotesEnabled()) return refuse;
  const userId = await requireUserId();
  if (!isUuid(deckId) || !isUuid(noteId) || typeof done !== "boolean") return refuse;
  await requireDeck(deckId, userId);
  try {
    if (!(await setDone(deckId, userId, noteId, done))) return refuse;
  } catch (err) {
    console.error("setNoteDone failed", err);
    return refuse;
  }
  surfaces(deckId);
  return { ok: true };
}

export async function deleteNote(deckId: string, noteId: string): Promise<DeckMutationResult> {
  const refuse = { ok: false as const, message: deckNotesCopy.confirm.refused };
  if (!deckNotesEnabled()) return refuse;
  const userId = await requireUserId();
  if (!isUuid(deckId) || !isUuid(noteId)) return refuse;
  await requireDeck(deckId, userId);
  try {
    if (!(await removeNote(deckId, userId, noteId))) return refuse;
  } catch (err) {
    console.error("deleteNote failed", err);
    return refuse;
  }
  surfaces(deckId);
  return { ok: true };
}

/** The `[[` picker's "any card" lookup. Null when the switch is off or the search fails. */
export async function searchNoteCards(query: string): Promise<NoteCardHit[] | null> {
  if (!deckNotesEnabled()) return null;
  await requireUserId();
  if (typeof query !== "string") return null;
  try {
    return await searchNoteCardsIn(query);
  } catch (err) {
    console.error("searchNoteCards failed", err);
    return null;
  }
}
