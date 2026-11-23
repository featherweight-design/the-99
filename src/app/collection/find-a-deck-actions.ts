"use server";

import { requireUserId } from "../../lib/auth";
import { closeFindADeck } from "../../lib/collection/find-a-deck";

export type CloseFindADeckResult = { ok: true; changed: boolean };

/**
 * The Find a deck call-out's ✕ (tool discovery call 1): stamps the CALLER's column once, and the call-out never draws
 * again. Nothing is revalidated: the call-out closes on the press, and the page's next render reads the column.
 */
export async function closeFindADeckAction(): Promise<CloseFindADeckResult> {
  const userId = await requireUserId();
  return { ok: true, changed: await closeFindADeck(userId, new Date()) };
}
