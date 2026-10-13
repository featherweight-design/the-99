import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { purgeAccount } from "../../../lib/account/purge";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clerk's webhook endpoint (Hugh's ruling Q8, 2026-10-12). Public in `src/proxy.ts`, because Clerk calls it
 * with no session; what authorizes it is the Svix signature, checked by `verifyWebhook` against
 * `CLERK_WEBHOOK_SIGNING_SECRET`, on every call. Until that secret is set the route answers 503 and does nothing;
 * an unsigned or forged request is refused with 400 before anything runs.
 *
 * Only `user.deleted` does anything: it purges every row the app holds for that account
 * (`purgeAccount`). Any other event is acknowledged and ignored, so subscribing to more events in the
 * dashboard cannot break this. A purge that fails answers 500, and Clerk retries; the purge is one
 * transaction and idempotent, so a retry either finishes the job or finds nothing left.
 */
export async function POST(req: Request) {
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
  if (evt.type !== "user.deleted") return new Response("Ignored", { status: 200 });
  const userId = evt.data.id;
  if (typeof userId !== "string" || userId.length === 0) return new Response("No user id", { status: 400 });
  try {
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
    return new Response("Purge failed", { status: 500 });
  }
}
