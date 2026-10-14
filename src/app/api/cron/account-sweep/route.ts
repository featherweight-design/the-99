import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { sweepTombstones } from "../../../../lib/account/sweep";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The account sweep's trigger (`src/lib/account/sweep.ts`), called by the Vercel cron in `vercel.json` every
 * five minutes. Public in `src/proxy.ts` (`/api/cron(.*)`); what authorizes it is `CRON_SECRET`, which Vercel
 * sends as a bearer token on every cron call. Until that secret is set it answers 503 and does nothing; a call
 * without it is refused with 401 before anything runs.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Cron not configured", { status: 503 });
  if (!bearerMatches(req.headers.get("authorization"), secret)) return new Response("Unauthorized", { status: 401 });
  try {
    const report = await sweepTombstones();
    // Counts only, never an id.
    console.info(`[account-sweep] re-purged ${report.swept}, failed ${report.failed}, retired ${report.retired}`);
    return Response.json(report);
  } catch (error) {
    const code = (error as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (error as { code?: unknown })?.code;
    console.error(`[account-sweep] sweep failed${typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? ` (${code})` : ""}`);
    return new Response("Sweep failed", { status: 500 });
  }
}

function bearerMatches(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? "", "utf8");
  const wanted = Buffer.from(`Bearer ${secret}`, "utf8");
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
