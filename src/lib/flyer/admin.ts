/**
 * The admin's flyer-code writes (flyer trial PR 4b; handoff Admin-Desktop A2 and A3). SERVER-ONLY; the caller has
 * already decided the actor is an admin (`src/app/admin/invites/flyer-actions.ts`). Each write records one
 * `admin_events` line.
 *
 * MAKE takes the switch writes' lock (so the group it names cannot be deleted under it), then the sender's invite lock,
 * and draws a code, retrying on the rare collision. The group is made BEFORE, by the group write (the action's), which
 * takes the same lock.
 *
 * REVOKE takes the creator's invite lock, the one every claim takes before it reads the code (`claim.ts`), so a claim
 * is either decided before the revoke or sees the code ended. It stamps `revoked_at` and nothing else: claims already
 * open are left alone (the sweep releases them when their hold lapses, and `claim.ts` refuses to prove one more) and
 * sign-ups already made keep their accounts, their group and their invites.
 */
import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, flagGroups, flyerCodes } from "../../db/schema";
import { lockSenderIn } from "../invites/send";
import { lockSwitchWrites } from "../switches/write-lock";
import { drawFlyerCode, MAKE_ATTEMPTS, parseStore } from "./admin-rule";

export type MakeFlyerCodeResult = { ok: true; id: string; code: string } | { ok: false; reason: "invalid" | "group" | "failed" };

export async function makeFlyerCode(
  actorId: string,
  input: { store: unknown; groupId: string },
  deps: { pick?: (n: number) => number; now?: Date } = {},
): Promise<MakeFlyerCodeResult> {
  const store = parseStore(input.store);
  if (store === null) return { ok: false, reason: "invalid" };
  const pick = deps.pick ?? ((n: number) => randomInt(n));
  return db.transaction(async (tx) => {
    await lockSwitchWrites(tx);
    const [group] = await tx.select({ id: flagGroups.id }).from(flagGroups).where(eq(flagGroups.id, input.groupId));
    if (!group) return { ok: false as const, reason: "group" as const };
    const now = await lockSenderIn(tx, actorId, deps.now);
    for (let attempt = 0; attempt < MAKE_ATTEMPTS; attempt++) {
      const code = drawFlyerCode(pick);
      // A taken code is skipped, not raised: a unique violation would abort the whole transaction.
      const [made] = await tx.insert(flyerCodes)
        .values({ code, label: store, groupId: group.id, createdBy: actorId, createdAt: now })
        .onConflictDoNothing({ target: flyerCodes.code })
        .returning({ id: flyerCodes.id });
      if (!made) continue;
      await tx.insert(adminEvents).values({ actorId, kind: "flyer_code_made", userId: actorId, groupId: group.id, newValue: code, note: store, at: now });
      return { ok: true as const, id: made.id, code };
    }
    return { ok: false as const, reason: "failed" as const };
  });
}

export type RevokeFlyerCodeResult = { ok: true; changed: boolean };

/** Ends a code to new sign-ups. Idempotent: a code already revoked, or gone, reads as done and writes nothing. */
export async function revokeFlyerCode(actorId: string, codeId: string, deps: { now?: Date } = {}): Promise<RevokeFlyerCodeResult> {
  const [found] = await db.select({ createdBy: flyerCodes.createdBy }).from(flyerCodes).where(eq(flyerCodes.id, codeId));
  if (!found) return { ok: true, changed: false };
  return db.transaction(async (tx) => {
    const now = await lockSenderIn(tx, found.createdBy, deps.now);
    const [row] = await tx.update(flyerCodes).set({ revokedAt: now })
      .where(and(eq(flyerCodes.id, codeId), isNull(flyerCodes.revokedAt)))
      .returning({ code: flyerCodes.code, groupId: flyerCodes.groupId });
    if (!row) return { ok: true as const, changed: false };
    await tx.insert(adminEvents).values({ actorId, kind: "flyer_code_revoked", userId: found.createdBy, groupId: row.groupId, oldValue: row.code, at: now });
    return { ok: true as const, changed: true };
  });
}
