import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { ABOUT_VERSION } from "./lib/copy/about";
import {
  ABOUT_COOKIE,
  cookieIsCurrent,
  cookieValue,
  gateApplies,
} from "./lib/about/gate";
import { aboutVersionSeen } from "./lib/about/read";

// Next.js 16 renamed the middleware entrypoint: `src/proxy.ts` is the
// replacement for `src/middleware.ts` (same functionality, new file convention).
//
// "/" is public so the signed-out landing (Task 8) can render;
// everything else remains Clerk-protected. Sign-in/up still happen on Clerk's
// hosted Account Portal — no in-app auth routes to allowlist.
//
// /api/health is public so an uptime check can reach it without a session. It
// returns migration counts and tags only — never connection details. Listed as
// the two exact forms rather than a prefix so a future /api/health-something
// does not become public by accident.
const isPublic = createRouteMatcher(["/", "/api/cron(.*)", "/api/health", "/api/health/"]);

/**
 * Whether this request is a reader loading a page, rather than the router
 * fetching a segment or a script asking for data. A redirect is only honest
 * for the first kind: an RSC payload answered with a redirect swaps the
 * fragment the router asked for, which is not the same as sending the reader
 * somewhere.
 */
function isDocumentRequest(req: Request): boolean {
  if (req.method !== "GET") return false;
  if (req.headers.get("RSC") === "1") return false;
  return (req.headers.get("accept") ?? "").includes("text/html");
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;

  // The gate runs AFTER this, never instead of it: an unauthenticated request
  // is Clerk's to answer, and /about is auth-gated like every other route, so
  // a pass-through here would send a signed-out reader into a loop.
  const { userId } = await auth.protect();

  const path = req.nextUrl.pathname;
  if (!gateApplies(path) || !isDocumentRequest(req)) return;

  // The cookie is the fast path and it is the whole reason this costs nothing
  // on a normal navigation: one database read per browser per version per
  // account, and none at all after it.
  if (cookieIsCurrent(req.cookies.get(ABOUT_COOKIE)?.value, userId)) return;

  // A failed read must not lock the reader out of the app. The page is a
  // reference; the app is the point.
  let seen = ABOUT_VERSION;
  try {
    seen = await aboutVersionSeen(userId);
  } catch {
    return;
  }

  const current = seen >= ABOUT_VERSION;
  const response = current
    ? NextResponse.next()
    : NextResponse.redirect(
        new URL(
          `/about?next=${encodeURIComponent(path + req.nextUrl.search)}`,
          req.url,
        ),
      );

  // Written on BOTH answers, and on the redirect especially: a reader who
  // reads the page and navigates away without pressing anything must not be
  // bounced straight back to it. Without this the redirect is a trap.
  response.cookies.set(ABOUT_COOKIE, cookieValue(userId), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
