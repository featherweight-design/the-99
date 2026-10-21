"use server";

import { requireUserId } from "../lib/auth";
import { dismissWelcomeStrip, readWelcomeLot } from "../lib/payments/welcome-read";

/**
 * Closes Home's welcome-credits strip for good (welcome credits D2, the strip's ✕; PR 2 is its caller). Per account,
 * so it holds on every device, and `dismissWelcomeStripWrite` writes only while the column is null, so a second press
 * or a second tab moves nothing.
 *
 * Signed in, and refuses (writes nothing) unless the reader holds a welcome lot that has not expired, the only reader the
 * strip is drawn for. No switch decides it: the strip draws whatever `WELCOME_CREDITS_ENABLED` or `PAYMENTS_ENABLED`
 * say (that switch gates only a new lot's write, and a lot held still spends), so a switch check here would refuse a
 * close the reader can see. Revalidates nothing: the strip hides itself on the press, and the write's stamp move
 * already retires Home's and `/decks`' cached payloads, so a revalidation would only ship this page back for nothing.
 */
export async function dismissWelcomeStripAction(): Promise<{ dismissed: boolean }> {
  const userId = await requireUserId();
  const lot = await readWelcomeLot(userId);
  if (!lot || lot.expired) return { dismissed: false };
  return { dismissed: await dismissWelcomeStrip(userId) };
}
