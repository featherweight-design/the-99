// Clear a purchase block (admin plan A3): an admin lets an account buy again after a dispute set the block (K2,
// `stripe_customers.purchase_blocked_at`). The block is set when a dispute is created and again when one is LOST
// (`reverseCharge`), so clearing it while a dispute is still open is allowed, and the press says how many are open
// and that losing one pauses buying again. One transaction: the column is nulled only where it is set, and the `purchase_block_cleared` event is
// written only when it was, so a repeat press clears nothing and records nothing. The event names the account and
// when the block was set, and no other id.
//
// The caller (the Payments tab's action) has already passed `requireAdmin()`.

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, stripeCustomers } from "../../db/schema";

export type ClearBlockResult = { ok: true; cleared: boolean } | { ok: false; error: "account" | "failed" };

export type ClearBlockDeps = { transaction: typeof db.transaction };
const DEPS: ClearBlockDeps = { transaction: (fn) => db.transaction(fn) };

export async function clearPurchaseBlock(actorId: string, accountId: unknown, deps: ClearBlockDeps = DEPS): Promise<ClearBlockResult> {
  if (typeof accountId !== "string" || accountId.trim() === "" || accountId.length > 200) return { ok: false, error: "account" };
  try {
    return await deps.transaction(async (tx): Promise<ClearBlockResult> => {
      const [row] = await tx
        .select({ at: stripeCustomers.purchaseBlockedAt })
        .from(stripeCustomers)
        .where(and(eq(stripeCustomers.userId, accountId), isNotNull(stripeCustomers.purchaseBlockedAt)))
        .for("update");
      if (!row?.at) return { ok: true, cleared: false };
      await tx.update(stripeCustomers).set({ purchaseBlockedAt: null }).where(eq(stripeCustomers.userId, accountId));
      await tx.insert(adminEvents).values({ actorId, kind: "purchase_block_cleared", userId: accountId, oldValue: row.at.toISOString() });
      return { ok: true, cleared: true };
    });
  } catch (error) {
    console.error("admin: a purchase block could not be cleared; nothing changed", error);
    return { ok: false, error: "failed" };
  }
}
