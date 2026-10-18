"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin/access";
import { grantGift, type GiftResult } from "../../../lib/admin/gift";

// The Payments tab's one write (admin plan A2b): Grant credits. It calls `requireAdmin()` on its first line
// (`actions.test.ts` reads every action module under src/app/admin); the actor is the gate's own `userId`, never an
// argument. `grantGift` validates the input, checks the account with Clerk, and writes the lot and its event in one
// transaction, idempotent on the form's `actionId`.

export async function grantCredits(input: { accountId: string; units: number; note: string; actionId: string }): Promise<GiftResult> {
  const { userId } = await requireAdmin();
  const result = await grantGift(userId, input);
  if (result.ok) revalidatePath("/admin/payments");
  return result;
}
