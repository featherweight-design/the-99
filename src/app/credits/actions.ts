"use server";

// Buying credits (payments K1b). The one action that starts a purchase: it takes the reader from the session,
// decides `PAYMENTS_ENABLED` for THAT reader (`requestSwitchEnv`), and refuses as `off` while it is off, so a
// stopped sale (the switch's `off` literal) creates no Session for anyone. The billing page (U1) is its caller;
// until then it has none.
//
// Nothing is granted here. The reader is sent to Stripe's hosted Checkout, and only the signed webhook grants.

import { currentUser } from "@clerk/nextjs/server";
import { requireUserId } from "../../lib/auth";
import { createPackCheckout } from "../../lib/payments/checkout";
import { paymentsEnabled } from "../../lib/payments/flag";
import { isPackId } from "../../lib/payments/packs";
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
