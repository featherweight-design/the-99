"use server";

// Buying credits (payments K1b). The one action that starts a purchase: it takes the reader from the session,
// decides `PAYMENTS_ENABLED` for THAT reader (`requestSwitchEnv`), and refuses as `off` while it is off, so a
// stopped sale (the switch's `off` literal) creates no Session for anyone. The billing page (U1) is its caller.
//
// `readReturnAction` and `receiptAction` are the page's other two: the return band's re-read and a history row's
// Receipt link. Both read Stripe through `src/lib/payments/` and grant nothing.
//
// Nothing is granted here. The reader is sent to Stripe's hosted Checkout, and only the signed webhook grants.

import { currentUser } from "@clerk/nextjs/server";
import { requireUserId } from "../../lib/auth";
import { createPackCheckout } from "../../lib/payments/checkout";
import { paymentsEnabled } from "../../lib/payments/flag";
import { isPackId } from "../../lib/payments/packs";
import { readReturn, receiptUrlFor } from "../../lib/payments/return";
import type { ReturnRead } from "../../lib/payments/return-rule";
import { stripeClient } from "../../lib/payments/stripe";
import { requestSwitchEnv } from "../../lib/switches/request";
import { isUuid } from "../../lib/uuid";

/**
 * A purchase press's outcome. `url`: send the reader to Stripe's Checkout there. `off`: payments are off for
 * this reader. `invalid`: not a pack this app sells, or a malformed press id. `unverified`: the reader has no
 * verified email (§5.6, card testing). `throttled`: ten Sessions already this hour. `unconfigured`: this
 * deployment cannot sell (no usable key, Price or origin). `failed`: Stripe or the database did not answer.
 */
export type CheckoutOutcome =
  | { ok: true; url: string }
  | { ok: false; reason: "off" | "invalid" | "unverified" | "throttled" | "unconfigured" | "failed" };

/** Buy a pack. `actionId` is a uuid the press mints once, so a double-tap or a retry makes one Session. */
export async function buyPackAction(packId: unknown, actionId: unknown): Promise<CheckoutOutcome> {
  const userId = await requireUserId();
  if (!paymentsEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  if (!isPackId(packId) || !isUuid(actionId)) return { ok: false, reason: "invalid" };

  const user = await currentUser();
  const email = user?.primaryEmailAddress;
  if (!email || email.verification?.status !== "verified") return { ok: false, reason: "unverified" };

  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "unconfigured" };
  try {
    return await createPackCheckout(stripe, { userId, email: email.emailAddress, packId, actionId: actionId as string });
  } catch (error) {
    // A fixed line: a Stripe or driver error's message can carry ids.
    const type = (error as { type?: unknown })?.type;
    console.error(`[checkout] failed${typeof type === "string" && /^Stripe\w+$/.test(type) ? ` (${type})` : ""}`);
    return { ok: false, reason: "failed" };
  }
}

/** The return band's re-read. `failed`: could not check (transient). */
export type ReturnOutcome = { ok: true; read: ReturnRead } | { ok: false; reason: "failed" };

/**
 * Where a purchase stands, read again by the return band every few seconds. The id is the URL's, so it proves
 * nothing: `readReturn` refuses a Session that is not this reader's own, as `none`.
 * NOT gated on the switch: stopping sales does not cancel a Checkout already open, and a status read grants nothing.
 */
export async function readReturnAction(sessionId: unknown): Promise<ReturnOutcome> {
  const userId = await requireUserId();
  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "failed" };
  try {
    return { ok: true, read: await readReturn(stripe, { sessionId, viewerId: userId }) };
  } catch (error) {
    console.error(`[checkout] return read failed${stripeType(error)}`);
    return { ok: false, reason: "failed" };
  }
}

export type ReceiptOutcome = { ok: true; url: string } | { ok: false; reason: "none" | "failed" };

/**
 * A history row's Receipt link, fetched on demand and never stored. NOT gated on the switch: a receipt is for money
 * already taken, and the reduced page (O4) keeps its history. The ownership check is `receiptUrlFor`'s.
 */
export async function receiptAction(sessionId: unknown): Promise<ReceiptOutcome> {
  const userId = await requireUserId();
  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "failed" };
  try {
    const url = await receiptUrlFor(stripe, { sessionId, viewerId: userId });
    return url ? { ok: true, url } : { ok: false, reason: "none" };
  } catch (error) {
    console.error(`[checkout] receipt read failed${stripeType(error)}`);
    return { ok: false, reason: "failed" };
  }
}

/** A fixed suffix for a log line: a Stripe or driver error's message can carry ids. */
function stripeType(error: unknown): string {
  const type = (error as { type?: unknown })?.type;
  return typeof type === "string" && /^Stripe\w+$/.test(type) ? ` (${type})` : "";
}
