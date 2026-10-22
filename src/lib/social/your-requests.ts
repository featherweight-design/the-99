/**
 * `/friends`' Your requests (spare requests PR 3d; handoff `design_handoff_the99_spare_requests` call 7, board
 * `Asker-States`): the reader's own asks, newest first, as `loadMyAsks` reads them, with the three things the rows
 * draw beyond it:
 * - `stillNeeded`: the cards the reader's decks still buy (their Shopping rows, `loadDeckBuyRows`, the cart's own
 *   read). Read ONLY when an open ask exists, since only an open ask can read `unneeded`; then the list is read again
 *   with it, so `askerState` stays the one rule.
 * - `unseen`: an answer newer than the reader's Friends cursor (`friends_seen_at`), read before the visit's own
 *   `markAnswersSeen` moves it in `after()`; the badge counts the same answers (`unseenAnswersCount`).
 * - `othersWithSpare`: after a No, the OTHER friends who offer the card now (`loadFriendSpares`, the Ask's own rule),
 *   most spares first, so the row can say whether anyone else has one.
 * Every read is the reader's own or goes through the friend grant on the reader; nothing names a Clerk id.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { loadDeckBuyRows } from "../decks/availability-query";
import { loadMyAsks, type MyAsk } from "./spare-requests";
import { spareRequestsEnabled } from "./flag";
import { loadFriendSpares } from "./spares";

export type YourRequest = MyAsk & {
  /** An answer the reader has not seen on `/friends` yet. */
  unseen: boolean;
  /** After a No: the other friends offering the card now, by name, most spares first. Empty otherwise. */
  othersWithSpare: string[];
};

const isOpen = (a: MyAsk) => a.state === "open" || a.state === "unavailable" || a.state === "unneeded";

/** Unseen: answered after the cursor; no cursor yet is every answer unseen. */
export function answerUnseen(a: Pick<MyAsk, "state" | "answeredAt">, seenAt: Date | null): boolean {
  if (a.state !== "yes" && a.state !== "no") return false;
  return a.answeredAt !== null && (seenAt === null || a.answeredAt.getTime() > seenAt.getTime());
}

/** The reader's Your requests, newest first; empty with spare requests off. */
export async function loadYourRequests(userId: string, env: NodeJS.ProcessEnv, now: Date): Promise<YourRequest[]> {
  if (!spareRequestsEnabled(env)) return [];
  const [first, prefs] = await Promise.all([
    loadMyAsks(userId, env, now),
    db.select({ seenAt: userPrefs.friendsSeenAt }).from(userPrefs).where(eq(userPrefs.userId, userId)),
  ]);
  const asks = first.some(isOpen)
    ? await loadMyAsks(userId, env, now, {
        stillNeeded: new Set((await loadDeckBuyRows(userId, undefined, undefined, env)).map((r) => r.oracleId)),
      })
    : first;
  const declined = asks.filter((a) => a.state === "no");
  const spares = declined.length === 0 ? [] : await loadFriendSpares(userId, [...new Set(declined.map((a) => a.oracleId))]);
  const seenAt = prefs[0]?.seenAt ?? null;
  return asks.map((a) => ({
    ...a,
    unseen: answerUnseen(a, seenAt),
    othersWithSpare: a.state !== "no" ? [] : spares
      .filter((s) => s.oracleId === a.oracleId && s.friend.publicId !== a.holder.publicId)
      .sort((x, y) => y.spare - x.spare || x.friend.displayName.localeCompare(y.friend.displayName))
      .map((s) => s.friend.displayName),
  }));
}
