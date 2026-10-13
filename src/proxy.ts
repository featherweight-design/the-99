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
  SHEET_ON_HEADER,
  sheetCookieIsCurrent,
  sheetCookieValue,
  sheetDecision,
} from "./lib/about/gate";
import { aboutSheetEnabled } from "./lib/about/flag";
import { howItWorksEnabled } from "./lib/about/how-it-works-flag";
import { ABOUT_VERSION } from "./lib/copy/about";
import { aboutSeen } from "./lib/about/read";
import { isFirstRun, unseenEntries, visibleEntries, type SeenState } from "./lib/about/visible";
import { resolveSwitchEnv, switchSnapshotState } from "./lib/switches/snapshot";
import { SWITCHES_HEADER } from "./lib/switches/request";
import { switchBits } from "./lib/switches/resolve";

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
//
// /api/clerk-webhook is public because Clerk calls it with no session; its route verifies the Svix
// signature before doing anything. Exact forms again, for the same reason.
//
// /api/csp-report is public because a browser sends a CSP report with no session; it only writes a
// cut-down log line and answers 204 (`api/csp-report/route.ts`).
const isPublic = createRouteMatcher(["/", "/api/cron(.*)", "/api/health", "/api/health/", "/api/clerk-webhook", "/api/clerk-webhook/", "/api/csp-report", "/api/csp-report/"]);

export default clerkMiddleware(async (auth, req) => {
  // `isPublic` is path-only, and "/" is the one public path a SIGNED-IN reader
  // uses constantly — it renders the dashboard, and it is where Clerk lands
  // them after sign-in. Returning early on the whole matcher therefore left the
  // most likely arrival in the app ungated, which is the one place the About
  // page most needs to appear. So: protect what is not public, read the session
  // on what is, and let the gate below judge both.
  // `[perf] proxy` with PERF_TIMING=1: what the proxy costs before any page runs, logged under the
  // request's own id. `memo` is how the switch overrides were answered: `hit` from the settled
  // per-instance memo, `pending` by waiting on another request's read, `miss` by a read of its own.
  const timing = process.env.PERF_TIMING === "1";
  const t0 = timing ? performance.now() : 0;
  const { userId } = isPublic(req) ? await auth() : await auth.protect();
  const t1 = timing ? performance.now() : 0;
  const memo = timing && userId ? switchSnapshotState() : null;
  // The reader's own switches (brief, locked rule 9): an account an override switches on sees that
  // feature's entry and its sheet, and the cookie below is keyed on what THEY see.
  const env = userId ? await resolveSwitchEnv(userId) : process.env;
  if (timing && userId) {
    console.log(`[perf] proxy auth=${Math.round(t1 - t0)} switches=${Math.round(performance.now() - t1)} memo=${memo}`);
  }
  // Both sheet headers are this proxy's to write, so neither survives from the client on any request.
  // The shell trusts them: `SHEET_ON_HEADER` is its whole answer to whether the sheet is on.
  const headers = new Headers(req.headers);
  headers.delete(SHEET_HEADER);
  headers.delete(SHEET_ON_HEADER);
  // The reader's resolved switches travel with the request, so `/about` and its actions decide from
  // this same snapshot (`requestSwitchEnv`) and never from a second memo of their own.
  headers.delete(SWITCHES_HEADER);
  if (userId) headers.set(SWITCHES_HEADER, switchBits(env));
  const pass = () => NextResponse.next({ request: { headers } });
  const path = req.nextUrl.pathname;
  // `/about` itself, as a navigation, in either mode: the page draws and acknowledges the entries
  // THIS request's switches show, which another instance's memo may not have agreed with when it
  // redirected here and set the legacy cookie. So that cookie is re-keyed to what this page is
  // drawn: an entry it did not draw stops matching, and the gate asks again once the instances
  // agree, rather than the cookie suppressing that entry for good. In sheet mode too, so a cookie
  // the legacy gate left is still corrected if the reader returns to it.
  // Any navigation the gate would handle (a document load or a client transition, never a
  // prefetch), since a reader sent here by a redirect arrives either way.
  const rekeyLegacy = (response: NextResponse): NextResponse => {
    if (userId && path === "/about" && gateHandles(req.method, req.headers)) {
      response.cookies.set(ABOUT_COOKIE, sheetCookieValue(userId, visibleEntries(env)), {
        ...COOKIE_OPTIONS,
        secure: req.nextUrl.protocol === "https:",
      });
    }
    return response;
  };
  if (userId && aboutSheetEnabled(env)) {
    headers.set(SHEET_ON_HEADER, "1");
    return rekeyLegacy(await sheet(req, userId, env, headers, pass));
  }
  if (!userId) return pass();

  if (path === "/about" && gateHandles(req.method, req.headers)) return rekeyLegacy(pass());
  if (!gateApplies(path) || !gateHandles(req.method, req.headers)) return pass();

  // The cookie is the fast path and the reason this costs nothing on a normal
  // navigation: one database read per browser per version per account. It is keyed to the
  // switched entries this reader is drawn (as the sheet's is), so flipping a switch retires it
  // and the gate decides again; a bare `<user>.<version>` could not tell a new entry from none.
  const visible = visibleEntries(env);
  const cookie = sheetCookieValue(userId, visible);
  if (req.cookies.get(ABOUT_COOKIE)?.value === cookie) return pass();

  // A failed read must not lock the reader out of the app. The page is a
  // reference; the app is the point.
  let seen: SeenState;
  try {
    seen = await aboutSeen(userId);
  } catch {
    return pass();
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
      : pass();

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
 * Both sheet headers are stripped from every request this proxy sees, signed in or not, and
 * whatever the switch says, before this runs: a client that sent its own could otherwise summon
 * the sheet, or forge the `seen` it lists entries from.
 */
async function sheet(req: NextRequest, userId: string, env: NodeJS.ProcessEnv, headers: Headers, pass: () => NextResponse) {
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
