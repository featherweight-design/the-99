import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { intakeReads } from "../../db/schema";
import {
  CHOOSE_HISTORY_PAGE, decodeKey, encodeKey, shapeRun,
  type ChooseHistoryPage, type ChooseHistoryRow, type HistoryKey,
} from "./history";
import { loadTheRead, reapAbandonedReads, type TheReadState } from "./run-store";

/**
 * The player's own Help me choose runs, for History. SERVER-ONLY. Stored reads: no model call, no
 * credit reserved. The one write is the reaper, which returns the credit of an abandoned pending
 * read exactly as `loadTheRead` does, so a dead read never sits in the list as `reading`.
 */

const createdAt = sql`date_trunc('milliseconds', ${intakeReads.createdAt})`;

/** The keyset predicate, exported so the emitted SQL is pinned by a test. */
export function afterKey(key: HistoryKey | null): SQL | undefined {
  if (!key) return undefined;
  return sql`(${createdAt}, ${intakeReads.id}) < (${key.at}::timestamp, ${key.id}::uuid)`;
}

/** The page query, built apart from running it so a test can render it. */
export function runsPageQuery(userId: string, key: HistoryKey | null, limit: number) {
  return db.select({
    id: intakeReads.id,
    createdAt: intakeReads.createdAt,
    status: intakeReads.status,
    errorClass: intakeReads.errorClass,
    ask: intakeReads.ask,
    result: intakeReads.result,
  }).from(intakeReads)
    .where(and(
      eq(intakeReads.userId, userId),
      // A run without its ask cannot be named or reopened: a row from before the column, or the retired engine's.
      sql`${intakeReads.ask} is not null`,
      or(
        eq(intakeReads.status, "ok"),
        eq(intakeReads.status, "pending"),
        and(eq(intakeReads.status, "failed"), eq(intakeReads.errorClass, "nothing_valid")),
      ),
      afterKey(key),
    ))
    .orderBy(desc(createdAt), desc(intakeReads.id))
    .limit(limit + 1);
}

export async function loadChooseHistory(
  userId: string,
  opts: { cursor?: string | null; limit?: number; now?: Date } = {},
): Promise<ChooseHistoryPage> {
  const limit = opts.limit ?? CHOOSE_HISTORY_PAGE;
  const key = decodeKey(opts.cursor);
  await reapAbandonedReads(userId, opts.now);
  const found = await runsPageQuery(userId, key, limit);
  const more = found.length > limit;
  const page = found.slice(0, limit);
  const rows = page.flatMap((r) => {
    const row = r.ask === null ? null : shapeRun({ ...r, ask: r.ask });
    return row ? [row] : [];
  });
  const last = page[page.length - 1];
  return {
    rows,
    nextCursor: more && last ? encodeKey({ at: last.createdAt.toISOString(), id: last.id }) : null,
  };
}

/**
 * Whether the player has a run History lists, for the New deck door's link: one indexed read. A hint
 * rather than the list itself: it does not reap an abandoned read, so a player whose only run died
 * unreaped sees the link and an empty list until the list's own read reaps it.
 */
export async function hasListableRun(userId: string): Promise<boolean> {
  const [row] = await db.select({ id: intakeReads.id }).from(intakeReads)
    .where(and(
      eq(intakeReads.userId, userId),
      sql`${intakeReads.ask} is not null`,
      or(
        eq(intakeReads.status, "ok"),
        eq(intakeReads.status, "pending"),
        and(eq(intakeReads.status, "failed"), eq(intakeReads.errorClass, "nothing_valid")),
      ),
    ))
    .limit(1);
  return row !== undefined;
}

/** A run opened from History: where it stands, and when it was made. Null for a run that is not the player's. */
export async function loadPastRead(
  readId: string,
  userId: string,
  now: Date = new Date(),
): Promise<{ state: TheReadState; at: string } | null> {
  const [row] = await db.select({ createdAt: intakeReads.createdAt }).from(intakeReads)
    .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId)));
  if (!row) return null;
  return { state: await loadTheRead(readId, userId, now), at: row.createdAt.toISOString() };
}

export type { ChooseHistoryRow };
