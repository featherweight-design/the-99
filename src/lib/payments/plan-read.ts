import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { subscriptions } from "../../db/schema";
import { holdsPlan } from "./subscription-rule";
import type { PlanSubscriptionFacts } from "./plan-card-rule";

/**
 * The reader's plan, from OUR `subscriptions` row (the webhook's copy; no Stripe call). SERVER-ONLY. A live plan wins
 * over an older ended one; with none live, the newest row stands (an ended plan reads as the offer again).
 */
export async function readPlanFacts(userId: string): Promise<PlanSubscriptionFacts | null> {
  const rows = await db.select({
    status: subscriptions.status,
    cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
  }).from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
  return rows.find((r) => holdsPlan(r.status)) ?? rows[0] ?? null;
}
