import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { purgeAnonymousReports } from "../../../../lib/feedback/purge";
import { purgeLaunchList } from "../../../../lib/flyer/launch-purge";
import { sweepFlyerClaims } from "../../../../lib/flyer/sweep";
import { sweepInvites } from "../../../../lib/invites/sweep";
import { captureServerError } from "../../../../lib/sentry/capture";
import { cronPausedHere, pausedResponse } from "../../../../lib/cron/staging-pause";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The invite sweep's trigger (`src/lib/invites/sweep.ts`), called by the Vercel cron in `vercel.json` every hour.
 * Public in `src/proxy.ts` (`/api/cron(.*)`); what authorizes it is `CRON_SECRET`, which Vercel sends as a bearer
 * token on every cron call, the account sweep's rule. Until that secret is set it answers 503 and does nothing; a
 * call without it is refused with 401 before anything runs. It reads no feature switch: a lapsed reservation is
 * returned whatever the switches say. It also purges the launch list once the launch date plus 30 days has passed
 * (the date set on the admin launch list card, else `FLYER_LAUNCH_DATE`; neither set, nothing is deleted), and deletes
 * signed-out problem reports (`feedback` rows with no `user_id`) 90 days after they were filed (`feedback/purge.ts`).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Cron not configured", { status: 503 });
  if (!bearerMatches(req.headers.get("authorization"), secret)) return new Response("Unauthorized", { status: 401 });
  // The staging project runs the same `vercel.json`; there the cron answers before it reads anything (`staging-pause.ts`).
  if (cronPausedHere()) return pausedResponse();
  try {
    const report = await sweepInvites();
    // The flyer trial's claims lapse on the same hourly run (flyer trial PR 2a).
    const flyer = await sweepFlyerClaims();
    // The launch list goes 30 days after the launch date; with no date set this does nothing (`launch-purge.ts`).
    // Its own try/catch: a purge error must not discard the counts of the two sweeps that already committed.
    let launchList: { due: boolean; deleted: number } | { error: true };
    let purgeNote: string;
    try {
      const purged = await purgeLaunchList();
      launchList = purged;
      purgeNote = purged.due ? `purged ${purged.deleted}` : "not due";
    } catch (purgeError) {
      const pcode = (purgeError as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (purgeError as { code?: unknown })?.code;
      launchList = { error: true };
      purgeNote = `purge failed${typeof pcode === "string" && /^[0-9A-Z]{5}$/.test(pcode) ? ` (${pcode})` : ""}`;
      captureServerError("invite-sweep-launch-purge", purgeError);
    }
    // Signed-out problem reports go 90 days after they were filed (`feedback/purge.ts`); signed-in rows are never touched.
    // Its own try/catch too: a failure here must not fail the sweep. (The whole route no-ops on staging, so staging
    // reports are not expired there.)
    let anonReports: { deleted: number } | { error: true };
    let reportNote: string;
    try {
      const gone = await purgeAnonymousReports();
      anonReports = gone;
      reportNote = `deleted ${gone.deleted}`;
    } catch (reportError) {
      const rcode = (reportError as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (reportError as { code?: unknown })?.code;
      anonReports = { error: true };
      reportNote = `failed${typeof rcode === "string" && /^[0-9A-Z]{5}$/.test(rcode) ? ` (${rcode})` : ""}`;
      captureServerError("invite-sweep-anon-reports", reportError);
    }
    // Counts only, never an id or an address.
    console.info(`[invite-sweep] returned ${report.returned}, revoked ${report.revoked}, reconciled ${report.reconciled}, kept ${report.kept}; flyer released ${flyer.released}, kept ${flyer.kept}; launch list ${purgeNote}; signed-out reports ${reportNote}`);
    return Response.json({ ...report, flyer, launchList, anonReports });
  } catch (error) {
    const code = (error as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (error as { code?: unknown })?.code;
    console.error(`[invite-sweep] sweep failed${typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? ` (${code})` : ""}`);
    captureServerError("invite-sweep", error);
    return new Response("Sweep failed", { status: 500 });
  }
}

function bearerMatches(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? "", "utf8");
  const wanted = Buffer.from(`Bearer ${secret}`, "utf8");
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
