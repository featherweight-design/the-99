import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { reportIngestAlert } from "../../../../lib/announcements/alert";
import { runAnnouncementsIngest } from "../../../../lib/announcements/ingest";
import { announcementsStore } from "../../../../lib/announcements/ingest-store";
import { captureServerError, sqlState } from "../../../../lib/sentry/capture";
import { cronPausedHere, pausedResponse } from "../../../../lib/cron/staging-pause";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The ingest stops starting page fetches at 240s (`budgetMs`); this leaves the last fetch and the writes room.
export const maxDuration = 300;

/**
 * The Announcements ingest's trigger (`src/lib/announcements/ingest.ts`), called by the Vercel cron in `vercel.json`
 * hourly, at :23. Runs dark: it writes `wizards_announcements` and nothing reads it yet. Authorized by `CRON_SECRET`
 * as the other crons are (503 until set, 401 without it), and paused on staging (`staging-pause.ts`). It reads no
 * feature switch: `ANNOUNCEMENTS_ENABLED` gates the reader surfaces, never the catalog they will read.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Cron not configured", { status: 503 });
  if (!bearerMatches(req.headers.get("authorization"), secret)) return new Response("Unauthorized", { status: 401 });
  if (cronPausedHere()) return pausedResponse();
  try {
    const report = await runAnnouncementsIngest({
      fetchText: async (url, init) => {
        const res = await fetch(url, { ...init, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(20_000) });
        return { status: res.status, text: await res.text() };
      },
      store: announcementsStore,
      alert: reportIngestAlert,
      now: () => new Date(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    });
    console.info(`[announcements-ingest] posts ${report.posts}, due ${report.due}, saved ${report.saved}, failed ${report.failed}, deferred ${report.deferred}, rematched ${report.rematched ?? "skipped"}, alerts ${report.alerts}`);
    return Response.json(report);
  } catch (error) {
    const code = sqlState(error);
    console.error(`[announcements-ingest] ingest failed${code ? ` (${code})` : ""}`);
    captureServerError("announcements-ingest", error);
    return new Response("Ingest failed", { status: 500 });
  }
}

function bearerMatches(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? "", "utf8");
  const wanted = Buffer.from(`Bearer ${secret}`, "utf8");
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
