import { NextResponse } from "next/server";
import { seedCards } from "../../../../lib/scryfall/seed";

// Pin to Node: the seed uses node:stream, stream-json, and ws, none of which run on Edge.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  // Guard the unset case: without it, an env misconfiguration would let the
  // literal header "Bearer undefined" trigger the seed job.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await seedCards();
  return NextResponse.json(result);
}
