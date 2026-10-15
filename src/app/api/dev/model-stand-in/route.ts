import { NextResponse } from "next/server";
import { standInReport } from "../../../../lib/model/stand-in-report";

// Read per request: the report is about this process's environment, never a cached one.
export const dynamic = "force-dynamic";

/**
 * DEVELOPMENT ONLY: which model calls this server would really make (`standInReport`), so a probe
 * can refuse to press anything that spends unless every path it presses is a stand-in
 * (`scripts/lib/model-stand-in.mjs`). A production build answers 404, exactly as a route that does
 * not exist, so nothing about a deployment's keys or switches is ever served; behind the proxy's
 * sign-in like every other `/api` route but the public ones.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const report = standInReport({
    NODE_ENV: process.env.NODE_ENV,
    SYNOPSIS_LIVE: process.env.SYNOPSIS_LIVE,
    INTAKE_LIVE: process.env.INTAKE_LIVE,
    FITS_READ_LIVE: process.env.FITS_READ_LIVE,
    TUNING_STUB_DELAY_MS: process.env.TUNING_STUB_DELAY_MS,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  });
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
