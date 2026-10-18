import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { accountTombstones } from "../../db/schema";

/** The tombstone's key: the SHA-256 of the Clerk id, hex. Random ids, never reissued, so it needs no key. */
export function tombstoneHash(userId: string): string {
  return createHash("sha256").update(userId, "utf8").digest("hex");
}

/** Whether the account's deletion has been recorded (`recordDeletion`): one read on the primary key. */
export async function isTombstoned(userId: string): Promise<boolean> {
  const [row] = await db.select({ id: accountTombstones.idHash }).from(accountTombstones)
    .where(eq(accountTombstones.idHash, tombstoneHash(userId)));
  return Boolean(row);
}
