import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 renamed the middleware entrypoint: `src/proxy.ts` is the
// replacement for `src/middleware.ts` (same functionality, new file convention).
//
// "/" is public so the signed-out landing (Task 8) can render;
// everything else remains Clerk-protected. Sign-in/up still happen on Clerk's
// hosted Account Portal — no in-app auth routes to allowlist.
//
// /api/health is public so an uptime check can reach it without a session. It
// returns migration counts and tags only — never connection details.
const isPublic = createRouteMatcher(["/", "/api/cron(.*)", "/api/health(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
