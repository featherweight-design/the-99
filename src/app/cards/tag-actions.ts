"use server";

import { requireUserId } from "../../lib/auth";
import type { NoteCardHit } from "../../lib/decks/notes-store";
import { searchNoteCards } from "../../lib/decks/notes-store";
import { helpMeChooseEnabled } from "../../lib/intake/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { tuningEnabled } from "../../lib/tuning/flag";

/**
 * The boxes that can name a card, each behind its own feature's switch. `description` is a deck's description box:
 * the header pencil that edits it is offered whatever the tuning switch says, so its lookup is behind no switch
 * of its own (the reader still has to be signed in).
 */
export type TagSurface = "intake" | "tuning" | "description";

const SWITCHES: Record<TagSurface, (env: NodeJS.ProcessEnv) => boolean> = { intake: helpMeChooseEnabled, tuning: tuningEnabled, description: () => true };

/**
 * The `[[` picker's "any card" lookup for a box outside a deck's notes (the same lookup the notes
 * use). Signed in, behind the surface's own switch, and a refusal or a failure answers null, which the
 * picker draws as "Couldn't search just now".
 */
export async function searchTagCards(surface: TagSurface, query: string): Promise<NoteCardHit[] | null> {
  const userId = await requireUserId();
  if (!Object.hasOwn(SWITCHES, surface) || !SWITCHES[surface](await requestSwitchEnv(userId))) return null;
  if (typeof query !== "string") return null;
  try {
    // A tag here is a requirement (or, in Suggested changes, a card to act on), and a card banned in Commander can have no deck: only legal cards are offered.
    return await searchNoteCards(query, { commanderLegalOnly: true });
  } catch (err) {
    console.error("searchTagCards failed", err);
    return null;
  }
}
