import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  ABOUT_COOKIE,
  cookieIsCurrent,
  gateApplies,
  gateDecision,
  gateHandles,
  isDocumentLoad,
  SHEET_COOKIE,
  SHEET_HEADER,
  sheetCookieIsCurrent,
  sheetDecision,
} from "./lib/about/gate";
import { aboutSheetEnabled } from "./lib/about/flag";
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

export default clerkMiddleware(async (auth, req) => {
  // `isPublic` is path-only, and "/" is the one public path a SIGNED-IN reader
  // uses constantly — it renders the dashboard, and it is where Clerk lands
  // them after sign-in. Returning early on the whole matcher therefore left the
  // most likely arrival in the app ungated, which is the one place the About
  // page most needs to appear. So: protect what is not public, read the session
  // on what is, and let the gate below judge both.
  const { userId } = isPublic(req) ? await auth() : await auth.protect();
  if (!userId) return;

  if (aboutSheetEnabled()) return sheet(req, userId);

  const path = req.nextUrl.pathname;
  if (!gateApplies(path) || !gateHandles(req.method, req.headers)) return;

  // The cookie is the fast path and the reason this costs nothing on a normal
  // navigation: one database read per browser per version per account.
  if (cookieIsCurrent(req.cookies.get(ABOUT_COOKIE)?.value, userId)) return;

  // A failed read must not lock the reader out of the app. The page is a
  // reference; the app is the point.
  let seen: number;
  try {
    seen = await aboutVersionSeen(userId);
  } catch {
    return;
  }

  const decision = gateDecision({ userId, pathname: path, search: req.nextUrl.search, seen });
  const response =
    decision.kind === "redirect"
      ? NextResponse.redirect(new URL(decision.to, req.url))
      : NextResponse.next();

  response.cookies.set(ABOUT_COOKIE, decision.cookie, {
    ...COOKIE_OPTIONS,
    secure: req.nextUrl.protocol === "https:",
  });
  return response;
});

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
} as const;

/**
 * About R6: the one-time sheet in place of the redirect. Never redirects. It
 * decides on a document load whether the root layout draws the sheet and says so
 * on a request header, which `Shell` reads back through `headers()`.
 *
 * The header is stripped from EVERY request first, including the ones this
 * ignores: a client that sends its own could otherwise summon the sheet, or
 * forge the `seen` it lists entries from.
 */
async function sheet(req: NextRequest, userId: string) {
  const headers = new Headers(req.headers);
  headers.delete(SHEET_HEADER);
  const pass = () => NextResponse.next({ request: { headers } });

  if (!gateApplies(req.nextUrl.pathname) || !isDocumentLoad(req.method, req.headers)) return pass();
  if (sheetCookieIsCurrent(req.cookies.get(SHEET_COOKIE)?.value, userId)) return pass();

  // A failed read draws nothing and writes nothing, so the next load asks again.
  let seen: number;
  try {
    seen = await aboutVersionSeen(userId);
  } catch {
    return pass();
  }

  const decision = sheetDecision({ userId, seen });
  if (decision.show) headers.set(SHEET_HEADER, String(decision.seen));
  const response = pass();
  response.cookies.set(SHEET_COOKIE, decision.cookie, {
    ...COOKIE_OPTIONS,
    secure: req.nextUrl.protocol === "https:",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
