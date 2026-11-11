import { NextResponse } from "next/server";

/** A route's answer to a hit `enforceHit` refused: 429 with `Retry-After`, and the route's own headers (`private, no-store`). */
export function tooManyRequests(retryAfter: number, headers: Record<string, string>): NextResponse {
  return NextResponse.json({ error: "rate-limited" }, { status: 429, headers: { ...headers, "Retry-After": String(retryAfter) } });
}
