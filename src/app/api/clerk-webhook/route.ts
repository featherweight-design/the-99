import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { purgeAccount, recordDeletion } from "../../../lib/account/purge";
import { reservationIdFrom, spendInviteOnSignUp } from "../../../lib/invites/spend";
import { grantWelcome } from "../../../lib/payments/welcome";
import { resolveSwitchEnvStrict } from "../../../lib/switches/snapshot";
import { captureServerError } from "../../../lib/sentry/capture";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clerk's webhook endpoint (Hugh's ruling Q8, 2026-10-12). Public in `src/proxy.ts`, because Clerk calls it
 * with no session; what authorizes it is the Svix signature, checked by `verifyWebhook` against
 * `CLERK_WEBHOOK_SIGNING_SECRET`, on every call. Until that secret is set the route answers 503 and does nothing;
 * an unsigned or forged request is refused with 400 before anything runs.
 *
 * Two events do something. `user.deleted` purges every row the app holds for that account (`purgeAccount`).
 * `user.created` does two independent things: it gives the account its one welcome lot (`grantWelcome`, launch epic D1;
 * gated by `WELCOME_CREDITS_ENABLED`, which only decides whether to write) and it spends the invite reservation the
 * account's invitation named, when it names one (`spendInviteOnSignUp`, invites plan R8), which reads no feature
 * switch, since an invitation already accepted is honored whatever the switches say, as a taken payment is. Either
 * failing answers 500 for a retry, and neither skips the other. Any other event is acknowledged and ignored, so
 * subscribing to more events in the dashboard cannot break this. A purge that fails answers 500, and Clerk retries; the purge is one
 * transaction and idempotent, so a retry either finishes the job or finds nothing left.
 */
export async function POST(req: NextRequest) {
  // Inert until configured: with no signing secret nothing can be verified, so nothing runs. Checked here
  // rather than left to `verifyWebhook`, so "not set up yet" can never depend on how a library fails.
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  let evt;
  try {
    evt = await verifyWebhook(req, { signingSecret: secret });
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }
  if (evt.type === "user.created") return handleCreated(evt.data);
  if (evt.type !== "user.deleted") return new Response("Ignored", { status: 200 });
  const userId = evt.data.id;
  if (typeof userId !== "string" || userId.length === 0) return new Response("No user id", { status: 400 });
  try {
    // The tombstone first, in its own commit: a purge that fails below is still re-run by the account sweep.
    await recordDeletion(userId);
    const report = await purgeAccount(userId);
    const direct = Object.values(report.rows).reduce((a, b) => a + b, 0);
    // Counts only, never the account id. `direct` is the PURGE_ORDER deletes alone: rows that went by
    // cascade (a deck's cards and versions) and the social half are not in it, and are reported apart.
    console.info(`[clerk-webhook] user.deleted: ${direct} rows deleted directly (cascades not counted); `
      + `${report.social.friendLinks} friend links; pods left ${report.social.podsLeft}, handed on `
      + `${report.social.podsHandedOn}, deleted ${report.social.podsDeleted}`);
    return new Response("Purged", { status: 200 });
  } catch (error) {
    // A fixed message and the SQLSTATE alone: a driver error's message and parameters can carry the id.
    const code = (error as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (error as { code?: unknown })?.code;
    console.error(`[clerk-webhook] purge failed${typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? ` (${code})` : ""}`);
    captureServerError("clerk-webhook:purge", error);
    return new Response("Purge failed", { status: 500 });
  }
}

/** A new account: its welcome lot, then its invite. Both are idempotent, so a retry repeats whichever failed. */
async function handleCreated(data: { id?: unknown; created_at?: unknown; first_name?: unknown; public_metadata?: unknown }): Promise<Response> {
  if (typeof data.id !== "string" || data.id.length === 0) return new Response("No user id", { status: 400 });
  let welcomeFailed = false;
  try {
    // The account's own creation time, so a redelivery cannot extend the lot; the event's clock only when it is absent.
    // A failed read of the overrides throws (a retryable 500) rather than reading as "switch off": nothing else would grant it later.
    const created = typeof data.created_at === "number" && Number.isFinite(data.created_at) ? new Date(data.created_at) : new Date();
    const result = await grantWelcome(data.id, created, await resolveSwitchEnvStrict(data.id));
    console.info(`[clerk-webhook] user.created: welcome ${result.granted ? "granted" : result.reason}`);
  } catch (error) {
    welcomeFailed = true;
    console.error("[clerk-webhook] user.created: welcome grant failed");
    captureServerError("clerk-webhook:welcome", error);
  }
  const invite = await spendOnCreated(data);
  return welcomeFailed && invite.ok ? new Response("Grant failed", { status: 500 }) : invite;
}

/**
 * An invited sign-up. A missing or unknown reservation spends nothing and still answers 200, so Clerk does not retry
 * an event that has nothing to do; a failure to spend answers 500, and the retry (or the newcomer's first `/friends`)
 * finishes it, since the spend is one transaction and idempotent.
 */
async function spendOnCreated(data: { id?: unknown; first_name?: unknown; public_metadata?: unknown }): Promise<Response> {
  const reservationId = reservationIdFrom(data.public_metadata);
  if (reservationId === null) return new Response("Ignored", { status: 200 });
  if (typeof data.id !== "string" || data.id.length === 0) return new Response("No user id", { status: 400 });
  try {
    const result = await spendInviteOnSignUp(data.id, reservationId, data.first_name);
    console.info(`[clerk-webhook] user.created: invite ${result.spent ? "spent" : result.reason}`);
    return new Response("Handled", { status: 200 });
  } catch (error) {
    console.error("[clerk-webhook] user.created: invite spend failed");
    captureServerError("clerk-webhook:invite", error);
    return new Response("Spend failed", { status: 500 });
  }
}
