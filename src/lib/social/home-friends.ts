// Home's Friends section (Social R3 addendum, readiness gap 1), read PER REQUEST, outside Home's cached payload: a friend's
// rename, a link made or revoked and a link's expiry move nothing that payload's key carries. Its own module so
// `check:list-cache` can hold the claim: Home is listed as reading it per request (`PER_REQUEST_READS`), and the guard
// fails if the page calls it inside `cachePageForUser`'s load or any cached loader imports it.
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { socialProfiles } from "../../db/schema";
import { listFriends, type Friend } from "./access";
import { commanderCard, commanderColumns, facePrinting, faceJoin, toCommander, type ProfileCommander } from "./commander";
import { listOpenInvites, type OpenInvite } from "./friends";

/** What Home's Friends section draws. `you` is null until the viewer's profile exists. */
export type HomeFriends = { you: { displayName: string; commander: ProfileCommander | null } | null; friends: Friend[]; links: OpenInvite[] };

/**
 * The viewer's own face, their friends and their open links, from ONE snapshot, as /friends reads them. Read-only, unlike `ensureProfile`: Home never creates a profile, so a viewer who has none draws
 * their seat with no initials (a blank face) until /friends or Add a friend makes one.
 */
export async function loadHomeFriends(viewerId: string, now = new Date()): Promise<HomeFriends> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ displayName: socialProfiles.displayName, ...commanderColumns })
      .from(socialProfiles)
      .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
      .leftJoin(facePrinting, faceJoin)
      .where(eq(socialProfiles.userId, viewerId));
    const friends = await listFriends(viewerId, tx);
    const links = await listOpenInvites(viewerId, now, tx);
    return { you: row ? { displayName: row.displayName, commander: toCommander(row) } : null, friends, links };
  // Repeatable read, never read-only: a read-only transaction poisons the pooled connection (cuts-read.ts).
  }, { isolationLevel: "repeatable read" });
}
