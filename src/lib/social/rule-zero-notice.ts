/**
 * The seat notice's read and its seen mark (Rule 0 revisions, item 6): "<host> seated you at <pod>'s table."
 *
 * **The grant is the seat, as everywhere in Rule 0** (`rule-zero.ts`): the viewer's own seat at the table, the table open on
 * the database's clock, and the viewer still a member of its pod, all joined on the viewer in the one statement. A notice is
 * UNSEEN while the seat's `notice_seen_at` is null; the setter's own seat is written seen at setup, so a setter has no notice.
 * A seat changed or removed sends no notice (brief state 12): nothing here reads a seat's change, and a removed seat has no row.
 *
 * The push flush resolves its words through `unseenSeatNotices` (so a table closed, a seat gone or a notice already seen is
 * dropped), and the in-app toast (PR 6b) reads the same list. `markSeatNoticeSeen` is the write: `TableLive` calls it through `markSeatNoticeSeenAction` when the table is open.
 * Nothing returned carries a Clerk id or another player's deck id: the deck is the viewer's own, the host a `ThirdPartyName`.
 */
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { decks, podMembers, pods, ruleZeroSeats, ruleZeroTables, socialProfiles } from "../../db/schema";
import type { ThirdPartyName } from "../person-name/brand";
import { named } from "../person-name/mint";
import type { Reader } from "./access";
import { tableOpen } from "./rule-zero-open";
import { isUuid } from "./rules";

export type SeatNotice = {
  tableId: string;
  /** Who set the table: another reader, so branded. */
  host: ThirdPartyName;
  podName: ThirdPartyName;
  /** The viewer's OWN seated deck's name, or null while the seat waits for a pick. */
  deckName: string | null;
  /** When the viewer was seated (their seat's `changed_at`). */
  since: Date;
};

const noticeSeat = alias(ruleZeroSeats, "notice_seat");
const noticePod = alias(podMembers, "notice_pod");
const noticeHost = alias(socialProfiles, "notice_host");
const noticeDeck = alias(decks, "notice_deck");

/**
 * The viewer's unseen seat notices, soonest-closing first; limited to `tableIds` when given. Apart so a test can render its
 * SQL. A table whose setter has no profile is left out (a notice with no host has no words).
 */
export function unseenSeatNoticesQuery(viewerId: string, tableIds?: readonly string[], q: Reader = db) {
  return q
    .select({
      tableId: ruleZeroTables.id,
      hostName: noticeHost.displayName,
      podName: pods.name,
      deckName: noticeDeck.name,
      since: noticeSeat.changedAt,
    })
    .from(ruleZeroTables)
    .innerJoin(noticeSeat, and(eq(noticeSeat.tableId, ruleZeroTables.id), eq(noticeSeat.userId, viewerId), isNull(noticeSeat.noticeSeenAt)))
    .innerJoin(noticePod, and(eq(noticePod.podId, ruleZeroTables.podId), eq(noticePod.userId, viewerId)))
    .innerJoin(pods, eq(pods.id, ruleZeroTables.podId))
    .innerJoin(noticeHost, eq(noticeHost.userId, ruleZeroTables.setBy))
    .leftJoin(noticeDeck, and(eq(noticeDeck.id, noticeSeat.deckId), eq(noticeDeck.userId, viewerId)))
    .where(and(tableOpen, ne(ruleZeroTables.setBy, viewerId), tableIds ? inArray(ruleZeroTables.id, [...tableIds]) : undefined))
    .orderBy(asc(ruleZeroTables.expiresAt), asc(ruleZeroTables.id));
}

export async function unseenSeatNotices(viewerId: string, tableIds?: readonly string[], q: Reader = db): Promise<SeatNotice[]> {
  if (tableIds && tableIds.length === 0) return [];
  const rows = await unseenSeatNoticesQuery(viewerId, tableIds, q);
  return rows.map((r) => ({ tableId: r.tableId, host: named(r.hostName), podName: named(r.podName), deckName: r.deckName, since: r.since }));
}

/**
 * The viewer has seen their notice for this table (they opened it, or dismissed the toast). ONE guarded UPDATE of the
 * viewer's own seat row; false when there was nothing to mark (not seated, or already seen). Idempotent.
 */
export function markSeatNoticeSeenQuery(viewerId: string, tableId: string, now: Date, q: Pick<typeof db, "update"> = db) {
  return q
    .update(ruleZeroSeats)
    .set({ noticeSeenAt: now })
    .where(and(eq(ruleZeroSeats.tableId, tableId), eq(ruleZeroSeats.userId, viewerId), isNull(ruleZeroSeats.noticeSeenAt)))
    .returning({ tableId: ruleZeroSeats.tableId });
}

export async function markSeatNoticeSeen(viewerId: string, tableId: unknown): Promise<boolean> {
  if (!isUuid(tableId)) return false;
  return (await markSeatNoticeSeenQuery(viewerId, tableId, new Date())).length > 0;
}
