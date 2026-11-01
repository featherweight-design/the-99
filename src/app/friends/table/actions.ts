"use server";

// Rule 0's writes from the table page (plan `2026-10-16-rule-zero.md` PR 4, PR 7): what the viewer has drawn, and the
// viewer's own seat's deck. The reader comes from the session; the
// library checks the seat grant itself. Nothing is revalidated: the table page redraws from the swap's own answer and
// its polls, and the pod row and Home's card are read per request.

import { requireUserId } from "../../../lib/auth";
import { markSeen, setSeatDeck } from "../../../lib/social/rule-zero";
import type { ThirdPartyName } from "../../../lib/person-name";
import { markSeatNoticeSeen, unseenSeatNotices } from "../../../lib/social/rule-zero-notice";
import { loadDeckChoices, loadTable, type DeckChoice, type TableView } from "../../../lib/social/rule-zero-table";

/** `revision` is the drawn snapshot's `revision` as an ISO string, never the time of the call. */
export async function markTableSeen(tableId: unknown, revision: unknown): Promise<boolean> {
  const userId = await requireUserId();
  if (typeof revision !== "string") return false;
  return markSeen(userId, tableId, new Date(revision));
}

/**
 * The viewer has the table open: their "seated you" notice is seen. Called by `TableLive` on mount, not by the page's render, so
 * a `router.refresh()` never re-writes it. One guarded UPDATE of the viewer's own seat row; a no-op once seen.
 */
export async function markSeatNoticeSeenAction(tableId: unknown): Promise<boolean> {
  const userId = await requireUserId();
  return markSeatNoticeSeen(userId, tableId);
}

/** What the in-app seat toast draws: the table, and who seated the viewer where. Names stay branded; no Clerk id. `since` (ms) is when the seat last changed: a re-seat re-arms a notice the reader had dismissed. */
export type SeatToastNotice = { tableId: string; host: ThirdPartyName; podName: ThirdPartyName; since: number };

/**
 * The viewer's unseen seat notices, for the toast host in the shell (Rule 0 revisions, item 6). Read on mount, on a navigation, on
 * focus and when the service worker hands over a seat push; scoped to the session's reader by `unseenSeatNotices`, which joins
 * the seat, the open table and the pod membership on the viewer in one statement.
 */
export async function unseenSeatNoticesAction(): Promise<SeatToastNotice[]> {
  const userId = await requireUserId();
  return (await unseenSeatNotices(userId)).map(({ tableId, host, podName, since }) => ({ tableId, host, podName, since: since.getTime() }));
}

export type SwapOutcome = { ok: true; view: TableView } | { ok: false };

/**
 * Seat one of the viewer's own decks (`Swap in`, `Change deck`, and `Undo`, which is a swap back). On success it
 * answers the table as it now reads, so the swapper's phone redraws first. A refusal (the table closed, the seat
 * lapsed, not their deck) answers `ok: false` and the page says so; the next poll draws a closed table.
 */
export async function swapSeatDeckAction(tableId: unknown, deckId: unknown): Promise<SwapOutcome> {
  const userId = await requireUserId();
  const result = await setSeatDeck(userId, tableId, deckId);
  if (result === "refused") return { ok: false };
  const view = await loadTable(userId, tableId);
  return view ? { ok: true, view } : { ok: false };
}

/** `Change deck`'s list, read when it is pressed: null when the seat grant has lapsed. */
export async function loadDeckChoicesAction(tableId: unknown): Promise<DeckChoice[] | null> {
  const userId = await requireUserId();
  return loadDeckChoices(userId, tableId);
}
