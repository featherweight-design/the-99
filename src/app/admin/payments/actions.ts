"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin/access";
import { grantGift, type GiftResult } from "../../../lib/admin/gift";
import { clearPurchaseBlock, type ClearBlockResult } from "../../../lib/payments/clear-block";

// The Payments tab's writes: Grant credits (admin plan A2b) and Let them buy (A3). Each calls `requireAdmin()` on its
// first line (`actions.test.ts` reads every action module under src/app/admin); the actor is the gate's own `userId`,
// never an argument. `grantGift` validates the input, checks the account with Clerk, and writes the lot and its event
// in one transaction, idempotent on the form's `actionId`; `clearPurchaseBlock` clears a set block and records it.

export async function grantCredits(input: { accountId: string; units: number; note: string; actionId: string }): Promise<GiftResult> {
  const { userId } = await requireAdmin();
  const result = await grantGift(userId, input);
  if (result.ok) revalidatePath("/admin/payments");
  return result;
}

/** Lets an account buy again after a dispute paused it (admin plan A3). A repeat press clears and records nothing. */
export async function clearBlock(accountId: string): Promise<ClearBlockResult> {
  const { userId } = await requireAdmin();
  const result = await clearPurchaseBlock(userId, accountId);
  if (result.ok && result.cleared) revalidatePath("/admin/payments");
  return result;
}
