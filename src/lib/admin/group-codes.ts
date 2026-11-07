// Which of a group's flyer codes the flyer trial has ended (small items 10, item 5). A code is live only while it is
// not revoked AND the trial is on for the account that made it: that creator's reading decides whether the code takes
// sign-ups (`flyer/join-read.ts`), so it decides here too. Off, a code reads as ended, Invites has no Flyer codes
// section to revoke it from, and a group holding only such codes could otherwise never be deleted.
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { flyerCodes } from "../../db/schema";
import { flyerTrialEnabled } from "../flyer/flag";
import { resolveFlags, resolveFlagsStrict } from "../flags/snapshot";

type Resolve = typeof resolveFlags | typeof resolveFlagsStrict;

/** The ids among `codes` whose creator has the trial off. Each distinct creator is resolved once. */
export async function endedCodeIds(
  codes: readonly { id: string; createdBy: string }[],
  resolve: Resolve = resolveFlags,
): Promise<Set<string>> {
  const creators = [...new Set(codes.map((c) => c.createdBy))];
  const on = new Map(await Promise.all(creators.map(async (u) => [u, flyerTrialEnabled(await resolve(u))] as const)));
  return new Set(codes.filter((c) => !on.get(c.createdBy)).map((c) => c.id));
}

/**
 * The same for the delete itself, read before its transaction: only the group's codes that are not revoked can block,
 * so only they are looked at. A strict read, so a switch read that failed refuses the delete rather than ending codes
 * from the fallbacks. Read before the transaction, a trial turned back on in between leaves a now-live code among the
 * ended ones: the delete then lands and the code loses its group, the same outcome the confirm already states.
 */
export async function loadEndedCodeIds(groupId: string): Promise<string[]> {
  const rows = await db
    .select({ id: flyerCodes.id, createdBy: flyerCodes.createdBy })
    .from(flyerCodes)
    .where(and(eq(flyerCodes.groupId, groupId), isNull(flyerCodes.revokedAt)));
  return [...(await endedCodeIds(rows, resolveFlagsStrict))];
}
