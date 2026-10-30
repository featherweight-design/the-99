/**
 * The flyer-claim sweep, run hourly with the invite sweep (`GET /api/cron/invite-sweep`). Counts never wait on it: a
 * claim's hold is derived from time (`holdsPlace`), so the sweep only writes it down, and erases what a lapsed claim
 * still holds: its address and its Clerk invitation. A claim whose invitation could not be ended is left as it is
 * for the next run, so a ticket never outlives its hold unrevoked. SERVER-ONLY.
 */
import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../db";
import { flyerClaims } from "../../db/schema";
import { clerkInvites, type ClerkInvites } from "../invites/clerk";

/** The most claims one run touches, so a backlog never makes a run that does not finish. */
export const FLYER_SWEEP_BATCH = 50;

export type FlyerSweepReport = { released: number; kept: number };

export async function sweepFlyerClaims(deps: { now?: Date; clerk?: ClerkInvites } = {}): Promise<FlyerSweepReport> {
  const now = deps.now ?? new Date();
  const clerk = deps.clerk ?? clerkInvites;
  const lapsed = await db.select({ id: flyerClaims.id, email: flyerClaims.email, clerkInvitationId: flyerClaims.clerkInvitationId })
    .from(flyerClaims)
    .where(and(inArray(flyerClaims.state, ["open", "proven"]), lte(flyerClaims.holdsUntil, now)))
    .limit(FLYER_SWEEP_BATCH);
  const report: FlyerSweepReport = { released: 0, kept: 0 };
  for (const row of lapsed) {
    try {
      const byId = row.clerkInvitationId !== null ? await clerk.revoke(row.clerkInvitationId) : true;
      // A hand-over whose answer was lost stored no id: end by address and claim id.
      const byAddress = row.email !== null ? await clerk.revokeFor(row.email, row.id) : true;
      if (!byId || !byAddress) {
        report.kept += 1;
        continue;
      }
    } catch {
      report.kept += 1;
      continue;
    }
    // Under the same condition it was read by: a claim proven or spent while Clerk was asked is not released.
    const done = await db.update(flyerClaims)
      .set({ state: "released", email: null, clerkInvitationId: null, codeHmac: null, codeExpiresAt: null, resolvedAt: now })
      .where(and(inArray(flyerClaims.state, ["open", "proven"]), lte(flyerClaims.holdsUntil, now), eq(flyerClaims.id, row.id)))
      .returning({ id: flyerClaims.id });
    report.released += done.length;
  }
  return report;
}
