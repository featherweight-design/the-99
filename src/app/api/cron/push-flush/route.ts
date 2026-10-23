import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { flushPush } from "../../../../lib/push/flush";
import { pushConfig } from "../../../../lib/push/config";
import { sendWebPush } from "../../../../lib/push/send";
import { captureServerError } from "../../../../lib/sentry/capture";
import { resolveSwitchEnvStrict } from "../../../../lib/switches/snapshot";

// Pin to Node: the neon-serverless websocket driver and `web-push` do not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The push flush's trigger (`src/lib/push/flush.ts`), called by the Vercel cron in `vercel.json` every fifteen minutes.
 * Public in `src/proxy.ts` (`/api/cron(.*)`); what authorizes it is `CRON_SECRET`, sent by Vercel as a bearer token. Until that
 * secret is set it answers 503 and does nothing; a call without it is refused with 401 before anything runs. Without the
 * VAPID keys it answers 200 `dormant` and reads nothing: the code is live on every deployment and sends only where Hugh set them.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Cron not configured", { status: 503 });
  if (!bearerMatches(req.headers.get("authorization"), secret)) return new Response("Unauthorized", { status: 401 });
  // Members only, never the env object itself (`check:switch-reads`).
  const config = pushConfig({
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  } as unknown as NodeJS.ProcessEnv);
  if (!config) return Response.json({ dormant: true });
  try {
    const report = await flushPush({ config, now: new Date(), send: sendWebPush, resolveEnv: resolveSwitchEnvStrict });
    // Counts only, never an id, an endpoint or a word.
    console.info(`[push-flush] rows ${report.rows}, readers ${report.readers}, sent ${report.sent}, held ${report.held}, gone ${report.gone}, failed ${report.failed}, abandoned ${report.abandoned}, pruned ${report.pruned}, queued ${report.queued}`);
    return Response.json(report);
  } catch (error) {
    const code = (error as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (error as { code?: unknown })?.code;
    console.error(`[push-flush] flush failed${typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? ` (${code})` : ""}`);
    // Caught here, so Next's onRequestError never sees it: report it the way the sibling crons do (a tag and SQLSTATE only).
    captureServerError("push-flush", error);
    return new Response("Flush failed", { status: 500 });
  }
}

function bearerMatches(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? "", "utf8");
  const wanted = Buffer.from(`Bearer ${secret}`, "utf8");
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
