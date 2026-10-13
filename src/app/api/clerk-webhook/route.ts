import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { purgeAccount } from "../../../lib/account/purge";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clerk's webhook endpoint (Hugh's ruling Q8, 2026-10-12). Public in `src/proxy.ts`, because Clerk calls it
 * with no session; what authorizes it is the Svix signature, checked by `verifyWebhook` against
 * `CLERK_WEBHOOK_SIGNING_SECRET`. An unsigned or forged request is refused with 400 before anything runs.
 *
 * Only `user.deleted` does anything: it purges every row the app holds for that account
 * (`purgeAccount`). Any other event is acknowledged and ignored, so subscribing to more events in the
 * dashboard cannot break this. A purge that fails answers 500, and Clerk retries; the purge is one
 * transaction and idempotent, so a retry either finishes the job or finds nothing left.
 */
export async function POST(req: Request) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }
  if (evt.type !== "user.deleted") return new Response("Ignored", { status: 200 });
  const userId = evt.data.id;
  if (typeof userId !== "string" || userId.length === 0) return new Response("No user id", { status: 400 });
  try {
    const report = await purgeAccount(userId);
    const total = Object.values(report.rows).reduce((a, b) => a + b, 0) + report.social.friendLinks;
    // Counts only: never the account id in a log line.
    console.info(`[clerk-webhook] user.deleted purged ${total} rows`);
    return new Response("Purged", { status: 200 });
  } catch (error) {
    console.error("[clerk-webhook] purge failed", error instanceof Error ? error.message : error);
    return new Response("Purge failed", { status: 500 });
  }
}
