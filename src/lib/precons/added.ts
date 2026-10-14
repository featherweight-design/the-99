/**
 * Whether a player has added a precon to their collection, read from the ledger: the add's entry
 * carries `precon:<file>` as its source (`add.ts`). Its own module, so a page that only asks the
 * question does not import the write path.
 */
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { collectionHistory } from "../../db/schema";

export const preconSource = (fileName: string) => `precon:${fileName}`;

/** The newest unreverted add of this precon for this player, as an ISO date, or null. */
export async function preconAddedOn(userId: string, fileName: string, runner: Pick<typeof db, "select"> = db): Promise<string | null> {
  const [row] = await runner
    .select({ at: collectionHistory.createdAt })
    .from(collectionHistory)
    .where(and(
      eq(collectionHistory.userId, userId),
      eq(collectionHistory.source, preconSource(fileName)),
      eq(collectionHistory.kind, "add"),
      isNull(collectionHistory.revertedBy),
    ))
    .orderBy(desc(collectionHistory.createdAt))
    .limit(1);
  return row ? row.at.toISOString() : null;
}
