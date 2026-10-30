/**
 * The flyer-claim sweep, run hourly with the invite sweep (`GET /api/cron/invite-sweep`). Counts never wait on it: a
 * claim's hold is derived from time (`holdsPlace`), so the sweep only writes it down, and erases what a lapsed claim
 * still holds: its address and its Clerk invitation. A claim whose invitation could not be ended is left as it is
 * for the next run, so a ticket never outlives its hold unrevoked. SERVER-ONLY.
 */
import { and, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
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
    .where(or(
      and(inArray(flyerClaims.state, ["open", "proven"]), lte(flyerClaims.holdsUntil, now)),
      // A released claim whose late ticket could not be revoked at the time keeps its id for this retry.
      and(eq(flyerClaims.state, "released"), isNotNull(flyerClaims.clerkInvitationId)),
    ))
    // Random, as the invite sweep's: claims that keep failing cleanup cannot keep the batch from the rest.
    .orderBy(sql`random()`)
    .limit(FLYER_SWEEP_BATCH);
  const report: FlyerSweepReport = { released: 0, kept: 0 };
  for (const row of lapsed) {
    // The claim's Clerk work is one transaction's at a time (the hand-over holds the same lock across its calls): a claim
    // being handed over right now is kept for the next run, so a ticket made while the sweep looked is never orphaned.
    const done = await db.transaction(async (tx) => {
      const got = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext(${`flyer-handover:${row.id}`})) as ok`);
      if (!(got.rows[0] as { ok: boolean }).ok) return null;
      // Read under the lock: a hand-over that finished first has stored its ticket id, which this run then revokes.
      const [cur] = await tx.select({ email: flyerClaims.email, clerkInvitationId: flyerClaims.clerkInvitationId, state: flyerClaims.state, holdsUntil: flyerClaims.holdsUntil })
        .from(flyerClaims).where(eq(flyerClaims.id, row.id)).for("update");
      if (!cur) return 0;
      const lapsedNow = (["open", "proven"].includes(cur.state) && cur.holdsUntil.getTime() <= now.getTime()) || (cur.state === "released" && cur.clerkInvitationId !== null);
      if (!lapsedNow) return 0;
      try {
        const byId = cur.clerkInvitationId !== null ? await clerk.revoke(cur.clerkInvitationId) : true;
        // A hand-over whose answer was lost stored no id: end by address and claim id.
        const byAddress = cur.email !== null ? await clerk.revokeFor(cur.email, row.id) : true;
        if (!byId || !byAddress) return null;
      } catch {
        return null;
      }
      const updated = await tx.update(flyerClaims)
        .set({ state: "released", email: null, clerkInvitationId: null, codeHmac: null, codeExpiresAt: null, resolvedAt: now })
        .where(eq(flyerClaims.id, row.id))
        .returning({ id: flyerClaims.id });
      return updated.length;
    });
    if (done === null) report.kept += 1;
    else report.released += done;
  }
  return report;
}
