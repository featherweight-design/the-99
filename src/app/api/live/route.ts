// Liveness for the uptime monitor (Better Stack): the function answers, and nothing else is asked. It imports nothing
// from the app on purpose, so no path from here reaches the database: Neon suspends after 5 idle minutes, and a
// poll every 3 minutes against `/api/health` would keep production compute awake around the clock. `/api/health`
// stays the readiness check (migrations, model calls); `route.test.ts` pins this file's imports. The tabs' build-skew
// check polls THIS route for the same reason.
export const dynamic = "force-dynamic";

export function GET() {
  // `deploymentId`: the build answering, which an open tab compares with its own (`skew-guard.tsx`). Public, and
  // null on a local server, where no tab can be behind. A read of the environment, never of the database.
  return Response.json({ status: "ok", deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null });
}
