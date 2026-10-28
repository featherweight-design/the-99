/**
 * Whether the viewer has a friend at all: the all-decks cart's By friend tells "No friends yet" from "no friend has a
 * spare" by it (cart v2 Empty-One B and C). Its own module, so the cart page can read it PER REQUEST beside its cached
 * payload (`PER_REQUEST_READS` in `scripts/lib/list-cache-tables.mjs`): a friend added or removed moves nothing in the
 * cart's key, and keying the cart on every friend's stamp for one yes or no would retire it on any friend's write.
 *
 * The friends list's own join (`access.ts`), on the viewer's link rows, one row at most.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { friendLinks, socialProfiles } from "../../db/schema";
import type { Reader } from "./access";

export function hasFriendQuery(viewerId: string, q: Reader = db) {
  return q
    .select({ publicId: socialProfiles.publicId })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .where(eq(friendLinks.userId, viewerId))
    .limit(1);
}

export async function hasFriend(viewerId: string, q: Reader = db): Promise<boolean> {
  return (await hasFriendQuery(viewerId, q)).length > 0;
}
