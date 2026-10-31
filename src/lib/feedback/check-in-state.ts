// The check-in's state row (flyer trial PR 6): one row per account in `check_in_state`, read and written inside a
// transaction that holds it `for update`, so two tabs loading Home at once count the day once and a Not now cannot
// race a Send. The rules are `check-in-rule.ts`; this file only moves a row through them.
import { eq } from "drizzle-orm";
import { checkInState } from "../../db/schema";
import type { db } from "../../db";
import type { CheckInState } from "./check-in-rule";

/** The transaction handle of `db.transaction`, as far as this file needs it. */
export type StateTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The account's row locked for the transaction, made as a first visit when there is none yet. */
export async function lockState(tx: StateTx, userId: string, now: Date): Promise<CheckInState & { shownAt: Date | null }> {
  await tx
    .insert(checkInState)
    .values({ userId, firstSeenAt: now })
    .onConflictDoNothing();
  const [row] = await tx.select().from(checkInState).where(eq(checkInState.userId, userId)).for("update");
  return row;
}

export async function saveState(tx: StateTx, userId: string, state: CheckInState): Promise<void> {
  await tx
    .update(checkInState)
    .set({
      visitDays: state.visitDays,
      lastVisitDay: state.lastVisitDay,
      snoozes: state.snoozes,
      snoozedUntil: state.snoozedUntil,
      endedAt: state.endedAt,
    })
    .where(eq(checkInState.userId, userId));
}

export async function markShown(tx: StateTx, userId: string, now: Date): Promise<void> {
  await tx.update(checkInState).set({ shownAt: now }).where(eq(checkInState.userId, userId));
}
