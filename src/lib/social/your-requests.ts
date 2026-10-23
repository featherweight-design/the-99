/**
 * `/friends`' Your requests (spare requests PR 3d; handoff `design_handoff_the99_spare_requests` call 7, board
 * `Asker-States`): the reader's own asks, newest first, from ONE read of the stored asks (`readShownAsks`, with the
 * cleared Nos still inside their cooldown) and ONE friend-spares read, then derived (`deriveMyAsks`, the rule
 * `loadMyAsks` uses). What the rows draw beyond `loadMyAsks`:
 * - `stillNeeded`: the cards the reader's decks still buy (their Shopping rows, `loadDeckBuyRows`, the cart's own
 *   read), read ONLY when an open ask exists, since only an open ask can read `unneeded`.
 * - The friend-spares read (`loadFriendSpares`) covers the open asks' cards (open or `unavailable`) AND the declined
 *   asks' cards (who else has one), in one call, so each friend's availability is read once per render.
 * - `unseen`: an answer newer than the reader's Friends cursor (`friends_seen_at`), read before the visit's own
 *   `markAnswersSeen` moves it in `after()`; the badge counts the same answers (`unseenAnswersCount`).
 * - `canAskAgain`: whether Ask again would be taken (`canAskAgain`, the write's `askRefusal`), counting a No the reader
 *   cleared, which still holds that friend back.
 * A cleared ask is read for that rule and never returned. Every read is the reader's own or goes through the friend
 * grant on the reader; nothing names a Clerk id.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { loadDeckBuyRows } from "../decks/availability-query";
import { canAskAgain, deriveMyAsks, offerKey, openAskCards, readShownAsks, type MyAsk } from "./spare-requests";
import { spareRequestsEnabled } from "./flag";
import { loadFriendSpares } from "./spares";

export type YourRequest = MyAsk & {
  /** An answer the reader has not seen on `/friends` yet. */
  unseen: boolean;
  /** After a No: the other friends offering the card now, by name, most spares first. Empty otherwise. */
  othersWithSpare: string[];
  /** Ask again would be taken now: no open ask for the card, and no No from this friend inside the cooldown. */
  canAskAgain: boolean;
};

/** Unseen: answered after the cursor; no cursor yet is every answer unseen. */
export function answerUnseen(a: Pick<MyAsk, "state" | "answeredAt">, seenAt: Date | null): boolean {
  if (a.state !== "yes" && a.state !== "no") return false;
  return a.answeredAt !== null && (seenAt === null || a.answeredAt.getTime() > seenAt.getTime());
}

/** The reader's Your requests, newest first; empty with spare requests off. */
export async function loadYourRequests(userId: string, env: NodeJS.ProcessEnv, now: Date): Promise<YourRequest[]> {
  if (!spareRequestsEnabled(env)) return [];
  const [shown, prefs] = await Promise.all([
    readShownAsks(userId, now, { keepClearedDeclines: true }),
    db.select({ seenAt: userPrefs.friendsSeenAt }).from(userPrefs).where(eq(userPrefs.userId, userId)),
  ]);
  const openCards = openAskCards(shown, now);
  const declinedCards = shown.filter(({ r, a }) => a.status === "no" && !r.cleared).map(({ r }) => r.oracle_id);
  const sparesCards = [...new Set([...openCards, ...declinedCards])];
  const [spares, buy] = await Promise.all([
    sparesCards.length === 0 ? Promise.resolve([]) : loadFriendSpares(userId, sparesCards),
    openCards.length === 0 ? Promise.resolve(null) : loadDeckBuyRows(userId, undefined, undefined, env),
  ]);
  const all = deriveMyAsks(
    shown, now, new Set(spares.map((s) => offerKey(s.oracleId, s.friend.publicId))),
    buy ? new Set(buy.map((b) => b.oracleId)) : undefined,
  );
  const seenAt = prefs[0]?.seenAt ?? null;
  return all.filter((a) => !a.cleared).map((a) => ({
    ...a,
    unseen: answerUnseen(a, seenAt),
    othersWithSpare: a.state !== "no" ? [] : spares
      .filter((s) => s.oracleId === a.oracleId && s.friend.publicId !== a.holder.publicId)
      .sort((x, y) => y.spare - x.spare || x.friend.displayName.localeCompare(y.friend.displayName))
      .map((s) => s.friend.displayName),
    canAskAgain: canAskAgain(a, all, now),
  }));
}
