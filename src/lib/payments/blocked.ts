import { eq } from "drizzle-orm";
import { db } from "../../db";
import { stripeCustomers } from "../../db/schema";

/**
 * Whether buying is paused for this account (K2): a dispute opened or was lost against one of its payments.
 * Read server-side before any Stripe call. Only buying stops: held credits keep spending. Cleared by an admin's
 * Let them buy on /admin/payments (`clearPurchaseBlock`).
 */
export async function purchaseBlocked(userId: string): Promise<boolean> {
  const [row] = await db.select({ at: stripeCustomers.purchaseBlockedAt }).from(stripeCustomers).where(eq(stripeCustomers.userId, userId));
  return row?.at != null;
}
