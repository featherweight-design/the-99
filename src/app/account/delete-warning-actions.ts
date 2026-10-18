"use server";

import { requireUserId } from "../../lib/auth";
import { readHeldPaid } from "../../lib/payments/held";
import type { HeldPaid } from "../../lib/payments/held-rule";

/**
 * The paid credits the signed-in reader holds, for the Manage account press (plan E6). Null when the read fails: the
 * press then goes straight to Clerk, since the warning is a courtesy and a failed read must not trap the reader.
 */
export async function heldPaidAction(): Promise<HeldPaid | null> {
  const userId = await requireUserId();
  try {
    return await readHeldPaid(userId);
  } catch {
    return null;
  }
}
