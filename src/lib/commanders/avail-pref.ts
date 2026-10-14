// The mode /commanders opens in when its URL names none: the one the reader last chose, stored
// per account (Hugh, 2026-09-27). One primary-key lookup either side.

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import type { Avail } from "./lane-params";

export function isAvail(value: unknown): value is Avail {
  return value === "all" || value === "free";
}

/** The saved mode. No row, or no choice made yet, reads as `all`, the lane's own default. */
export async function readCommandersAvail(userId: string): Promise<Avail> {
  const [row] = await db
    .select({ avail: userPrefs.commandersAvail })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return isAvail(row?.avail) ? row.avail : "all";
}

export function writeCommandersAvailQuery(userId: string, avail: Avail) {
  return db
    .insert(userPrefs)
    .values({ userId, commandersAvail: avail })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { commandersAvail: avail },
      // Only when the mode changes: a no-op UPDATE would still move the reader's stamp (0123).
      setWhere: sql`${userPrefs.commandersAvail} is distinct from ${avail}`,
    });
}

export async function writeCommandersAvail(userId: string, avail: Avail): Promise<void> {
  await writeCommandersAvailQuery(userId, avail);
}
