import { and, desc, eq, inArray } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db";
import { creditGrants, paymentRecords } from "../../db/schema";
import { decideReturn, isSessionId, type ReturnRead } from "./return-rule";
import { PAID_SOURCES } from "../model/credit-rule";
import { isOurSession } from "./packs";

/**
 * The Checkout return's read (buying-credits plan E1). SERVER-ONLY, and the only place the page touches the
 * Session. It RETRIEVES the Session by id, lets `decideReturn` refuse one that is not this viewer's, and only
 * then looks for the grant, by Session id AND this viewer's id (a grant row of another account never answers).
 * A Session Stripe does not know reads as `none`; any other failure throws, so the caller can say it could
 * not check rather than draw a band that is not true.
 */
export async function readReturn(stripe: Stripe, input: { sessionId: unknown; viewerId: string }): Promise<ReturnRead> {
  if (!isSessionId(input.sessionId)) return { kind: "none" };
  const session = await retrieveOrNull(stripe, input.sessionId);
  if (!session) return { kind: "none" };
  const facts = { metadata: session.metadata ?? {}, paymentStatus: session.payment_status };
  if (decideReturn(facts, input.viewerId, null).kind === "none") return { kind: "none" };
  // A pack's lot is keyed by the Session; a plan's by its first INVOICE, which the Session names once the
  // subscription is created (null before: nothing to find yet, so the band reads as processing).
  const lotKey = session.mode === "subscription" ? idOf(session.invoice) : input.sessionId;
  if (!lotKey) return decideReturn(facts, input.viewerId, null);
  const [grant] = await db.select({ units: creditGrants.units }).from(creditGrants)
    .where(and(eq(creditGrants.externalId, lotKey), eq(creditGrants.userId, input.viewerId)));
  return decideReturn(facts, input.viewerId, grant?.units ?? null);
}

const idOf = (v: string | { id: string } | null | undefined): string | null => (v == null ? null : typeof v === "string" ? v : v.id);

async function retrieveOrNull(stripe: Stripe, sessionId: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if ((error as { code?: unknown })?.code === "resource_missing") return null;
    throw error;
  }
}

/**
 * A purchase's receipt link, fetched on demand and never stored (plan E8): the Session's PaymentIntent's latest
 * Charge's `receipt_url`. The same ownership check as the return: a Session that is not this app's or not this
 * viewer's answers null, as does one with no charge yet.
 */
export async function receiptUrlFor(stripe: Stripe, input: { sessionId: unknown; viewerId: string }): Promise<string | null> {
  if (!isSessionId(input.sessionId)) return null;
  const session = await retrieveOrNull(stripe, input.sessionId);
  if (!session || !input.viewerId) return null;
  if (!isOurSession(session.metadata) || session.metadata?.user_id !== input.viewerId) return null;
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!intent) return null;
  const pi = await stripe.paymentIntents.retrieve(intent, { expand: ["latest_charge"] });
  const charge = pi.latest_charge;
  const url = charge && typeof charge !== "string" ? charge.receipt_url : null;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}

/**
 * The reader's purchases, newest first, for the history list (plan E8). One row per `credit_grants` lot: a pack
 * now, a plan month once the subscription PR writes them (the shape is ready: `source`, `units`, `revokedUnits`,
 * `externalId`). `externalId` is the Checkout Session id a Receipt link is fetched by; it is never a Stripe
 * URL, and no receipt URL is stored. `amountCents` and `currency` are what the kept payment record says was PAID
 * (tax included), never the registry's price today; a lot with no record carries null and draws no amount.
 */
export type CreditHistoryRow = {
  id: string;
  source: "plan" | "pack";
  units: number;
  revokedUnits: number;
  createdAt: Date;
  externalId: string | null;
  /** What was paid, in the currency's minor unit, from the kept payment record; null when no record backs the lot. */
  amountCents: number | null;
  currency: string | null;
};

export const HISTORY_LIMIT = 100;

export function creditHistoryQuery(userId: string) {
  return db.select({
    id: creditGrants.id,
    source: creditGrants.source,
    units: creditGrants.units,
    revokedUnits: creditGrants.revokedUnits,
    createdAt: creditGrants.createdAt,
    externalId: creditGrants.externalId,
    amountCents: paymentRecords.amountCents,
    currency: paymentRecords.currency,
  }).from(creditGrants)
    // The record has no account id (kept through the purge), so it is reached THROUGH the viewer's own grant.
    .leftJoin(paymentRecords, eq(creditGrants.externalId, paymentRecords.checkoutSessionId))
    // Purchases only (`PAID_SOURCES`): a welcome lot or an admin's gift is no history row and never makes a reader
    // "someone who has bought".
    .where(and(eq(creditGrants.userId, userId), inArray(creditGrants.source, [...PAID_SOURCES]))).orderBy(desc(creditGrants.createdAt)).limit(HISTORY_LIMIT);
}

export async function listCreditHistory(userId: string): Promise<CreditHistoryRow[]> {
  const rows = await creditHistoryQuery(userId);
  return rows.map((r) => ({ ...r, source: r.source === "plan" ? "plan" : "pack" }));
}
