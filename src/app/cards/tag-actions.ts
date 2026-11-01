"use server";

import { requireUserId } from "../../lib/auth";
import type { NoteCardHit } from "../../lib/decks/notes-store";
import { searchNoteCards } from "../../lib/decks/notes-store";

/**
 * The boxes that can name a card. None is behind a switch any more (the reader still has to be signed in): `tuning` is
 * Suggested changes' boxes, on the Analysis tab, whose switch and Suggested changes' are retired (always on). `intake`
 * is Help me choose's box, its switch retired too. `description` is a deck's description box, and `gameNote` is the
 * log-a-game form's note.
 */
export type TagSurface = "intake" | "tuning" | "description" | "gameNote";

const SURFACES: ReadonlySet<string> = new Set<TagSurface>(["intake", "tuning", "description", "gameNote"]);

/**
 * The `[[` picker's "any card" lookup for a box outside a deck's notes (the same lookup the notes
 * use). Signed in, for a known surface, and a refusal or a failure answers null, which the
 * picker draws as "Couldn't search just now".
 */
export async function searchTagCards(surface: TagSurface, query: string): Promise<NoteCardHit[] | null> {
  await requireUserId();
  if (!SURFACES.has(surface)) return null;
  if (typeof query !== "string") return null;
  try {
    // A tag here is a requirement (or, in Suggested changes, a card to act on), and a card banned in Commander can have no deck: only legal cards are offered.
    return await searchNoteCards(query, { commanderLegalOnly: true });
  } catch (err) {
    console.error("searchTagCards failed", err);
    return null;
  }
}
