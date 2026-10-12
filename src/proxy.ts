import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  ABOUT_COOKIE,
  gateApplies,
  gateDecision,
  gateHandles,
  isDocumentLoad,
  SHEET_COOKIE,
  SHEET_HEADER,
  sheetCookieIsCurrent,
  sheetCookieValue,
  sheetDecision,
} from "./lib/about/gate";
import { aboutSheetEnabled } from "./lib/about/flag";
import { howItWorksEnabled } from "./lib/about/how-it-works-flag";
import { ABOUT_VERSION } from "./lib/copy/about";
import { aboutSeen } from "./lib/about/read";
import { isFirstRun, unseenEntries, visibleEntries, type SeenState } from "./lib/about/visible";
import { resolveSwitchEnv } from "./lib/switches/snapshot";

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
  // The reader's own switches (brief, locked rule 9): an account an override switches on sees that
  // feature's entry and its sheet, and the cookie below is keyed on what THEY see.
  const env = userId ? await resolveSwitchEnv(userId) : process.env;
  if (aboutSheetEnabled(env)) return sheet(req, userId, env);
  if (!userId) return;

  const path = req.nextUrl.pathname;
  if (!gateApplies(path) || !gateHandles(req.method, req.headers)) return;

  // The cookie is the fast path and the reason this costs nothing on a normal
  // navigation: one database read per browser per version per account. It is keyed to the
  // switched entries this reader is drawn (as the sheet's is), so flipping a switch retires it
  // and the gate decides again; a bare `<user>.<version>` could not tell a new entry from none.
  const visible = visibleEntries(env);
  const cookie = sheetCookieValue(userId, visible);
  if (req.cookies.get(ABOUT_COOKIE)?.value === cookie) return;

  // A failed read must not lock the reader out of the app. The page is a
  // reference; the app is the point.
  let seen: SeenState;
  try {
    seen = await aboutSeen(userId);
  } catch {
    return;
  }

  // Sent only when there is something to be told, by the same rule the sheet uses: a brand-new
  // account, or an entry this deployment draws that this reader has not seen. A bump that added
  // entries only behind switches that are off sends nobody to a page with nothing new, and an
  // entry switched on later is still new however far the version floor has caught up.
  const behind = isFirstRun(seen) || unseenEntries(visible, seen).length > 0;
  const decision = gateDecision({
    userId,
    pathname: path,
    search: req.nextUrl.search,
    seen: behind ? 0 : ABOUT_VERSION,
  });
  const response =
    decision.kind === "redirect"
      ? NextResponse.redirect(new URL(decision.to, req.url))
      : NextResponse.next();

  response.cookies.set(ABOUT_COOKIE, cookie, {
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
 * on a request header, for the root layout to read back through `headers()`.
 *
 * With the switch on, the header is stripped from every request this proxy
 * sees, signed in or not, including the ones it otherwise ignores. A client that
 * sends its own could otherwise summon the sheet, or forge the `seen` it lists
 * entries from. With the switch off nothing reads the header, so nothing strips it.
 */
async function sheet(req: NextRequest, userId: string | null, env: NodeJS.ProcessEnv) {
  const headers = new Headers(req.headers);
  headers.delete(SHEET_HEADER);
  const pass = () => NextResponse.next({ request: { headers } });

  if (!userId) return pass();
  if (!gateApplies(req.nextUrl.pathname) || !isDocumentLoad(req.method, req.headers)) return pass();
  // The entries this reader is drawn, read from their resolved switches. They key the cookie, so a
  // switch flipped on, for everyone or for them, retires the cookie and the next load decides again.
  const visible = visibleEntries(env);
  if (sheetCookieIsCurrent(req.cookies.get(SHEET_COOKIE)?.value, userId, visible)) return pass();

  // A failed read draws nothing and writes nothing, so the next load asks again.
  let seen: SeenState;
  try {
    seen = await aboutSeen(userId);
  } catch {
    return pass();
  }

  const decision = sheetDecision({ userId, seen, visible, appendix: howItWorksEnabled(env) });
  if (decision.show) headers.set(SHEET_HEADER, decision.header);
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
