"use server";

// Settings' Spares writes (menu and Home plan PR 3, handoff G3). Every action takes the reader from the session, as
// `/friends`' actions do. The writes live in `lib/social/spare-settings.ts`; nothing here names a table.
//
// Revalidation: `/settings` alone, inline, because the page redraws from the reply. A friend's spares are read per
// request (`GET /api/friend-spares`, uncached), and a cached page drawing them keys on `friendGeneration`, which the
// stamp trigger on `user_prefs` and `spare_keep` moves: nothing else needs telling.

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { writeFriendDeckPrefs } from "../../lib/social/deck-visibility";
import {
  keepCardBack, releaseCard, searchSpareCards, setSpareMin, type SpareSearchHit,
} from "../../lib/social/spare-settings";

const refreshSettings = () => revalidatePath("/settings");

export type SpareWriteOutcome = { ok: true } | { ok: false; reason: "invalid" };

/** The threshold stepper: an integer from 1 to 9 (`cleanSpareMin`), anything else `invalid`. */
export async function setSpareMinAction(value: unknown): Promise<SpareWriteOutcome> {
  const userId = await requireUserId();
  if (!(await setSpareMin(userId, value))) return { ok: false, reason: "invalid" };
  refreshSettings();
  return { ok: true };
}

/** Keep a card back. `invalid`: not an oracle id, or not a card in the catalog. */
export async function keepCardAction(oracleId: unknown): Promise<SpareWriteOutcome> {
  const userId = await requireUserId();
  if (!(await keepCardBack(userId, oracleId))) return { ok: false, reason: "invalid" };
  refreshSettings();
  return { ok: true };
}

/** A kept row's ✕: the card goes back to the spares. */
export async function releaseCardAction(oracleId: unknown): Promise<SpareWriteOutcome> {
  const userId = await requireUserId();
  if (!(await releaseCard(userId, oracleId))) return { ok: false, reason: "invalid" };
  refreshSettings();
  return { ok: true };
}

export type SpareSearchOutcome = { ok: true; hits: SpareSearchHit[] };

/** Keep a card back's search over the reader's own spare cards. A read, so nothing revalidates. */
export async function searchSpareCardsAction(query: unknown): Promise<SpareSearchOutcome> {
  const userId = await requireUserId();
  return { ok: true, hits: await searchSpareCards(userId, query) };
}

/**
 * Your decks (friend decks G2): the two rules, both booleans, anything else `invalid`. A friend's tab and the deck
 * page read the rules per request, and the stamp trigger on `user_prefs` moves `friendGeneration` for a cached page:
 * `/settings` is all that redraws here.
 */
export async function setFriendDeckPrefsAction(seeDecks: unknown, seeUnfinished: unknown): Promise<SpareWriteOutcome> {
  const userId = await requireUserId();
  if (typeof seeDecks !== "boolean" || typeof seeUnfinished !== "boolean") return { ok: false, reason: "invalid" };
  await writeFriendDeckPrefs(userId, { seeDecks, seeUnfinished });
  refreshSettings();
  return { ok: true };
}
