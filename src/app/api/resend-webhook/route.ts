import type { NextRequest } from "next/server";
import { isReportedEvent, templateOf, verifySvix } from "../../../lib/email/resend-webhook";
import { captureServerWarning } from "../../../lib/sentry/capture";
import { logEvent } from "../../../lib/sentry/log-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend's webhook (bounces and spam complaints). Public in `src/proxy.ts`, because Resend calls it with no session; what
 * authorizes it is the Svix signature on the raw body, checked against `RESEND_WEBHOOK_SECRET` on every call. Until that
 * secret is set the route answers 503 and does nothing; a missing or wrong signature answers 401 before the body is read as
 * JSON.
 *
 * `email.bounced` and `email.complained` each raise one Sentry warning and one Sentry log line carrying the event type and
 * the template (`code`, `flyer-code`, `invite`, `launch`) and nothing else: never an address, a subject or a message id. Any other
 * event is acknowledged with 200 and ignored, so subscribing to more events in the dashboard cannot break this.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const body = await req.text();
  const ok = verifySvix(
    body,
    { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") },
    secret,
  );
  if (!ok) return new Response("Webhook verification failed", { status: 401 });
  let event: { type?: unknown; data?: unknown };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Ignored", { status: 200 });
  }
  if (!isReportedEvent(event.type)) return new Response("Ignored", { status: 200 });
  const template = templateOf(event.data);
  captureServerWarning("resend-webhook", `Resend ${event.type}`, { event: event.type, template });
  logEvent("resend.webhook", { event: event.type, template }, "warn");
  return new Response("Noted", { status: 200 });
}
