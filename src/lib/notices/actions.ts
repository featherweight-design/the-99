"use server";

/**
 * Opening Notices (deck notices plan PR 6, HANDOFF §3): read the deck's notices and mark what was
 * READ. Data entries go quiet (the dot off, the tag quiet on the page, gone from the tile) and the
 * legality set the player saw is remembered, so its dot goes off until the set changes (F11).
 *
 * The marks are the ones the read returned, never the log head at write time: an entry published
 * between the read and the write was not shown, and marking it read would hide it.
 */
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireUserId } from "../auth";
import { noticesEnabled } from "./flag";
import { isUuid } from "../uuid";
import { markNoticesRead } from "./mark";
import { loadDeckNotices, type DeckNotices } from "./read";

/**
 * The deck's notices WITHOUT marking them: what the header's tag draws. Read after the page mounts
 * rather than by the deck page's loader, so a page that never draws a notice pays nothing for it.
 */
export async function peekNotices(deckId: string): Promise<DeckNotices | null> {
  // Behind the release switch here too, not only in the page: an action is callable directly.
  if (!noticesEnabled() || !isUuid(deckId)) return null;
  return loadDeckNotices(deckId, await requireUserId());
}

export async function openNotices(deckId: string): Promise<DeckNotices | null> {
  if (!noticesEnabled() || !isUuid(deckId)) return null;
  const userId = await requireUserId();
  const notices = await loadDeckNotices(deckId, userId);
  if (!notices) return null;
  const legalMarked = await markNoticesRead(deckId, userId, notices.readMarks);
  // Deferred, as every revalidating action here is: in the action's own run it would re-render the
  // deck page into this reply.
  after(() => {
    revalidatePath("/decks");
    revalidatePath("/decks/[id]", "page");
  });
  // As the deck now stands: data read, and the legality set quiet only where it was recorded. A set
  // the deck's cards moved away from while this opened stays unread until the next read.
  return { ...notices, dataUnread: 0, violationsUnread: notices.violationsUnread && !legalMarked };
}
