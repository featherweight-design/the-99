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
import { readChip } from "../../lib/payments/chip";
import type { ChipState } from "../../lib/payments/chip-rule";
import { createPackCheckout, createPlanCheckout } from "../../lib/payments/checkout";
import { purchaseBlocked } from "../../lib/payments/blocked";
import { paymentsEnabled } from "../../lib/payments/flag";
import { isPackId, isPlanId } from "../../lib/payments/packs";
import { openCardPortal, setPlanCancelling } from "../../lib/payments/plan-manage";
import { invoiceReceiptUrlFor, readReturn, receiptUrlFor } from "../../lib/payments/return";
import { isInvoiceId, type ReturnRead } from "../../lib/payments/return-rule";
import { stripeClient } from "../../lib/payments/stripe";
import { requestSwitchEnv } from "../../lib/switches/request";
import { isUuid } from "../../lib/uuid";

/**
 * A purchase press's outcome. `url`: send the reader to Stripe's Checkout there. `off`: payments are off for
 * this reader. `invalid`: not a pack this app sells, or a malformed press id. `unverified`: the reader has no
 * verified email (§5.6, card testing). `throttled`: ten Sessions already this hour. `unconfigured`: this
 * deployment cannot sell (no usable key, Price or origin). `blocked`: a dispute opened against this account's
 * payment and buying is paused (the account's purchase block; held credits still spend). `failed`: Stripe or the database did not answer.
 */
export type CheckoutOutcome =
  | { ok: true; url: string }
  | { ok: false; reason: "off" | "invalid" | "unverified" | "throttled" | "unconfigured" | "failed" | "blocked" };

/** Buy a pack. `actionId` is a uuid the press mints once, so a double-tap or a retry makes one Session. */
export async function buyPackAction(packId: unknown, actionId: unknown): Promise<CheckoutOutcome> {
  const userId = await requireUserId();
  if (!paymentsEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  if (!isPackId(packId) || !isUuid(actionId)) return { ok: false, reason: "invalid" };

  // Before any Stripe call. A database that cannot answer fails closed: no Session is made on a guess.
  const blocked = await purchaseBlocked(userId).catch(() => null);
  if (blocked === null) return { ok: false, reason: "failed" };
  if (blocked) return { ok: false, reason: "blocked" };

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

/** The plan's outcomes: the purchase vocabulary plus `already` (the account holds a live plan). */
export type PlanCheckoutOutcome =
  | { ok: true; url: string }
  | { ok: false; reason: "off" | "invalid" | "unverified" | "throttled" | "unconfigured" | "failed" | "already" | "blocked" };

/** Subscribe to the monthly plan. The same rules as `buyPackAction`, the same per-press uuid. */
export async function buyPlanAction(planId: unknown, actionId: unknown): Promise<PlanCheckoutOutcome> {
  const userId = await requireUserId();
  if (!paymentsEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  if (!isPlanId(planId) || !isUuid(actionId)) return { ok: false, reason: "invalid" };

  // Before any Stripe call, failing closed, exactly as the pack's press.
  const blocked = await purchaseBlocked(userId).catch(() => null);
  if (blocked === null) return { ok: false, reason: "failed" };
  if (blocked) return { ok: false, reason: "blocked" };

  const user = await currentUser();
  const email = user?.primaryEmailAddress;
  if (!email || email.verification?.status !== "verified") return { ok: false, reason: "unverified" };

  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "unconfigured" };
  try {
    return await createPlanCheckout(stripe, { userId, email: email.emailAddress, planId, actionId: actionId as string });
  } catch (error) {
    console.error(`[checkout] plan failed${stripeType(error)}`);
    return { ok: false, reason: "failed" };
  }
}

/**
 * The plan card's outcomes (U3a). `ok`: done (`unchanged` when the plan was already in that state). `off`: payments
 * are off for this reader. `unconfigured`: no usable key or origin. `not_found`: no live plan of this reader's own
 * (a subscription Stripe does not tag as theirs answers the same, with no detail). `failed`: Stripe or the database did not answer.
 */
export type PlanChangeOutcome =
  | { ok: true; unchanged: boolean }
  | { ok: false; reason: "off" | "unconfigured" | "not_found" | "failed" };

async function changePlan(cancel: boolean): Promise<PlanChangeOutcome> {
  const userId = await requireUserId();
  if (!paymentsEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "unconfigured" };
  try {
    const result = await setPlanCancelling(stripe, userId, cancel);
    if (!result.ok) {
      if (result.reason === "foreign") console.error("[plan] change refused: the subscription is not tagged as this reader's");
      return { ok: false, reason: "not_found" };
    }
    return { ok: true, unchanged: !result.changed };
  } catch (error) {
    console.error(`[plan] change failed${stripeType(error)}`);
    return { ok: false, reason: "failed" };
  }
}

/** Stop the plan renewing at the period end (E4). The webhook, not this, writes our row and the lots' expiry. */
export async function cancelPlanAction(): Promise<PlanChangeOutcome> {
  return changePlan(true);
}

/** Undo a cancel: the plan renews again (E4). */
export async function keepPlanAction(): Promise<PlanChangeOutcome> {
  return changePlan(false);
}

export type ManageCardOutcome =
  | { ok: true; url: string }
  | { ok: false; reason: "off" | "unconfigured" | "not_found" | "failed" };

/** Update the card: Stripe's billing portal on The 99's own configuration (E5). Unset `STRIPE_PORTAL_CONFIG` is `unconfigured`. */
export async function manageCardAction(): Promise<ManageCardOutcome> {
  const userId = await requireUserId();
  if (!paymentsEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "unconfigured" };
  try {
    return await openCardPortal(stripe, userId);
  } catch (error) {
    console.error(`[plan] portal failed${stripeType(error)}`);
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
 * A history row's Receipt link (a pack's Session id or a plan month's invoice id), fetched on demand and never stored. NOT gated on the switch: a receipt is for money
 * already taken, and the reduced page (O4) keeps its history. The ownership check is `receiptUrlFor`'s.
 */
export async function receiptAction(reference: unknown): Promise<ReceiptOutcome> {
  const userId = await requireUserId();
  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "failed" };
  try {
    // A pack's reference is its Checkout Session; a plan month's is its invoice (`in_`).
    const url = isInvoiceId(reference)
      ? await invoiceReceiptUrlFor(stripe, { invoiceId: reference, viewerId: userId })
      : await receiptUrlFor(stripe, { sessionId: reference, viewerId: userId });
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

/**
 * The account menu's chip, re-read (plan E10) each time the menu opens, so a spend since the layout rendered shows. A
 * return from Checkout loads the page afresh, and the shell reads it then. Decided from
 * the reader's own switches; `null` hides the chip (`readerSeesCredits`). Reads only, grants nothing.
 */
export async function chipAction(): Promise<ChipState | null> {
  const userId = await requireUserId();
  return readChip(userId, await requestSwitchEnv(userId));
}
