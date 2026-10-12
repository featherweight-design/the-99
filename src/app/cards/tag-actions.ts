"use server";

import { requireUserId } from "../../lib/auth";
import type { NoteCardHit } from "../../lib/decks/notes-store";
import { searchNoteCards } from "../../lib/decks/notes-store";
import { helpMeChooseEnabled } from "../../lib/intake/flag";

/** The boxes that can name a card, each behind its own feature's switch. */
export type TagSurface = "intake";

/**
 * The `[[` picker's "any card" lookup for a box outside a deck's notes (the same lookup the notes
 * use). Signed in, behind the surface's own switch, and a refusal or a failure answers null, which the
 * picker draws as "Couldn't search just now".
 */
export async function searchTagCards(surface: TagSurface, query: string): Promise<NoteCardHit[] | null> {
  await requireUserId();
  if (surface !== "intake" || !helpMeChooseEnabled()) return null;
  if (typeof query !== "string") return null;
  try {
    // A tag here is a requirement, and a card banned in Commander can have no deck: only legal cards are offered.
    return (await searchNoteCards(query)).filter((h) => h.commanderLegal);
  } catch (err) {
    console.error("searchTagCards failed", err);
    return null;
  }
}
