/**
 * `/friends`' Your requests (spare requests PR 3d; handoff `design_handoff_the99_spare_requests` call 7, board
 * `Asker-States`): the reader's own asks, newest first, from ONE read of the stored asks (`readShownAsks`, with the
 * cleared Nos still inside their cooldown) and ONE friend-spares read, then derived (`deriveMyAsks`, the rule
 * `loadMyAsks` uses). What the rows draw beyond `loadMyAsks`:
 * - `stillNeeded`: the cards the reader's decks still buy (their Shopping rows, `loadDeckBuyRows`, the cart's own
 *   read), read ONLY when an open ask exists, since only an open ask can read `unneeded`.
 * - The friend-spares read (`loadFriendSpares`) covers the open asks' cards (open or `unavailable`), the expired asks'
 *   cards (Ask again needs the holder to offer it still) AND the declined asks' cards (who else has one), in one call,
 *   so each friend's availability is read once per render.
 * - `unseen`: an answer newer than the reader's Friends cursor (`friends_seen_at`), read before the visit's own
 *   `markAnswersSeen` moves it in `after()`, and not opened one by one over Home (`asker_seen_at`); the badge counts the
 *   same answers (`unseenAnswersCount`).
 * - `canAskAgain`: whether Ask again would be taken (`canAskAgain`, the write's `askRefusal`), counting a No the reader
 *   cleared, which still holds that friend back, and only while the holder still offers the card.
 * A cleared ask is read for that rule and never returned. Every read is the reader's own or goes through the friend
 * grant on the reader; nothing names a Clerk id.
 */
import { eq, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { feedItems, spareRequests, userPrefs } from "../../db/schema";
import { compareNames } from "../person-name";
import type { ThirdPartyName } from "../person-name/brand";
import { parseDismissKey } from "./feed-dismiss";
import { loadDeckBuyRows } from "../decks/availability-query";
import { canAskAgain, deriveMyAsks, offerKey, openAskCards, readShownAsks, type MyAsk } from "./spare-requests";
import { socialFriendsEnabled } from "./flag";
import { requestState } from "./spare-request-rules";
import { loadFriendSpares } from "./spares";

export type YourRequest = MyAsk & {
  /** An answer the reader has not seen on `/friends` yet. */
  unseen: boolean;
  /** After a No: the other friends offering the card now, by name, most spares first. Empty otherwise. */
  othersWithSpare: ThirdPartyName[];
  /** Ask again would be taken now: no open ask for the card, and no No from this friend inside the cooldown. */
  canAskAgain: boolean;
};

/**
 * Unseen: answered after the Friends cursor (no cursor yet is every answer unseen) AND after the answer was opened one
 * by one (`seenAt`, the answer sheet over Home); the badge's SQL reads the same two (`unseenAnswers`).
 */
export function answerUnseen(a: Pick<MyAsk, "state" | "answeredAt"> & { seenAt?: Date | null }, cursor: Date | null): boolean {
  if (a.state !== "yes" && a.state !== "no") return false;
  if (a.answeredAt === null) return false;
  const after = (at: Date | null | undefined) => at == null || a.answeredAt!.getTime() > at.getTime();
  return after(cursor) && after(a.seenAt);
}

/** The reader's Your requests, newest first; empty with spare requests off. */
export async function loadYourRequests(userId: string, env: NodeJS.ProcessEnv, now: Date): Promise<YourRequest[]> {
  if (!socialFriendsEnabled(env)) return [];
  const [shown, prefs] = await Promise.all([
    readShownAsks(userId, now, { keepClearedDeclines: true }),
    db.select({ seenAt: userPrefs.friendsSeenAt }).from(userPrefs).where(eq(userPrefs.userId, userId)),
  ]);
  const openCards = openAskCards(shown, now);
  const declinedCards = shown.filter(({ r, a }) => a.status === "no" && !r.cleared).map(({ r }) => r.oracle_id);
  // An expired ask (stored `expired`, or still `open` past its window) offers Ask again only to a holder who offers now.
  const expiredCards = shown.filter(({ r, a }) => !r.cleared && requestState(a, now) === "expired").map(({ r }) => r.oracle_id);
  const sparesCards = [...new Set([...openCards, ...expiredCards, ...declinedCards])];
  const [spares, buy] = await Promise.all([
    sparesCards.length === 0 ? Promise.resolve([]) : loadFriendSpares(userId, sparesCards),
    openCards.length === 0 ? Promise.resolve(null) : loadDeckBuyRows(userId),
  ]);
  const offered = new Set(spares.map((s) => offerKey(s.oracleId, s.friend.publicId)));
  const all = deriveMyAsks(
    shown, now, offered,
    buy ? new Set(buy.map((b) => b.oracleId)) : undefined,
  );
  const seenAt = prefs[0]?.seenAt ?? null;
  return all.filter((a) => !a.cleared).map((a) => ({
    ...a,
    unseen: answerUnseen(a, seenAt),
    othersWithSpare: a.state !== "no" ? [] : spares
      .filter((s) => s.oracleId === a.oracleId && s.friend.publicId !== a.holder.publicId)
      .sort((x, y) => y.spare - x.spare || compareNames(x.friend.displayName, y.friend.displayName))
      .map((s) => s.friend.displayName),
    canAskAgain: canAskAgain(a, all, now, offered.has(offerKey(a.oracleId, a.holder.publicId))),
  }));
}

/**
 * The spare request an ANSWER item on Home names (`item:<feed id>`, the key the row already carries): the reader's own
 * stored answer item, whose `dedupe_key` is the request it answers (`answerSpare`'s `recordFeedItem`), joined to that
 * request as the reader's own ask. An incoming ask's item, another reader's item, or another kind names nothing.
 * Apart for a test.
 */
export function answeredRequestIdQuery(userId: string, feedItemId: string): SQL {
  return sql`select asr.id from ${feedItems} afi
    join ${spareRequests} asr on asr.id::text = afi.dedupe_key and asr.asker_user_id = afi.user_id
    where afi.user_id = ${userId} and afi.id = ${feedItemId}::uuid and afi.kind = 'spare-request'
      and afi.data ->> 'answer' is not null`;
}

/**
 * The one Your requests row a Home answer item opens over Home (small items item 3, board `Spare-Answer-Sheet`), read
 * through the same rule as `/friends` so the two say the same thing; null when the key names no answer of the reader's,
 * or the request was cleared since.
 */
export async function loadAnsweredRequest(userId: string, key: string, env: NodeJS.ProcessEnv, now: Date): Promise<YourRequest | null> {
  const target = parseDismissKey(key);
  if (target?.kind !== "item" || !socialFriendsEnabled(env)) return null;
  const { rows } = await db.execute<{ id: string }>(answeredRequestIdQuery(userId, target.id));
  const id = rows[0]?.id;
  if (!id) return null;
  return (await loadYourRequests(userId, env, now)).find((r) => r.id === id) ?? null;
}
