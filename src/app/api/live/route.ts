// Liveness for the uptime monitor (Better Stack): the function answers, and nothing else is asked. It imports nothing
// from the app on purpose, so no path from here reaches the database: Neon suspends after 5 idle minutes, and a
// poll every 3 minutes against `/api/health` would keep production compute awake around the clock. `/api/health`
// stays the readiness check (migrations, model calls); `route.test.ts` pins this file's imports.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
