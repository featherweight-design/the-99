import { readAllowance } from "../model/allowance";
import type { HeldPaid } from "./held-rule";

/**
 * The paid credits an account holds (`held-rule.ts`). A welcome lot is a gift, not a purchase, so it is not here. Read
 * whether payments are on or off for the reader: a player who bought while they were on still loses what they hold.
 * SERVER-ONLY: it reads the database.
 */
export async function readHeldPaid(userId: string, now: Date = new Date()): Promise<HeldPaid> {
  const a = await readAllowance(userId, now);
  return { plan: a.plan ?? 0, pack: a.pack ?? 0 };
}
