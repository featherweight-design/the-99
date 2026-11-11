import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isNavigation } from "./lib/navigation-request";
import { resolveFlags, switchSnapshotState } from "./lib/flags/snapshot";
import { SWITCHES_HEADER } from "./lib/flags/request";
import { switchBits } from "./lib/flags/resolve";
import { CLAIM_COOKIE, claimCookieOptions, mintClaimSecret } from "./lib/invites/claim-cookie";
import { isQrToken } from "./lib/invites/rules";
import { SIGN_IN_PATH, SIGN_UP_PATH } from "./components/public/links";

// Next.js 16 renamed the middleware entrypoint: `src/proxy.ts` is the
// replacement for `src/middleware.ts` (same functionality, new file convention).
//
// "/" is public so the signed-out landing (Task 8) can render;
// everything else remains Clerk-protected. Signing in happens in the app, at
// `/sign-in` (listed below), and a protected page sends a stranger there
// (`signInUrl`, at the foot of this file).
//
// /api/health is public so an uptime check can reach it without a session. It
// returns migration counts and tags only — never connection details. Listed as
// the two exact forms rather than a prefix so a future /api/health-something
// does not become public by accident.
//
// /api/live is public for the same reason: the uptime monitor polls it without a session. It answers
// {"status":"ok"} and touches no database (it is the poll target so Neon can suspend; /api/health is the readiness check).
//
// /api/clerk-webhook is public because Clerk calls it with no session; its route verifies the Svix
// signature before doing anything. Exact forms again, for the same reason.
//
// /offline is public because the service worker keeps a SIGNED-OUT copy of it to show when a page
// load finds no network (`public/sw.js`): it is static and holds nothing of anyone's.
// /api/csp-report is public because a browser sends a CSP report with no session; it only writes a
// cut-down log line and answers 204 (`api/csp-report/route.ts`).
// /api/stripe-webhook is public because Stripe calls it with no session; its route verifies Stripe's
// signature on the raw body and refuses anything unsigned (`api/stripe-webhook/route.ts`).
// /friend/<token> is public because a friend link is opened by someone who may not be signed in yet: the
// page draws a signed-out reader a card that reads nothing and offers Sign in, and reads the link only for
// a signed-in reader (`app/friend/[token]/page.tsx`, Social R1 E8). `/friends` stays
// protected: the pattern needs the slash.
// /report is public because Report a problem is also for a reader who cannot reach the app: the crash screen is drawn to link
// there (once the switch is on for everyone), signed in or not (`app/report/page.tsx`). The page decides the feedback switch and answers 404 while it is off.
// /card/<slug> and /commander/<slug> are the public catalog pages (launch epic F3): the PAGE enforces its switch
// (`PUBLIC_PAGES_ENABLED`) and answers 404 while it is off, so a stranger is never sent to sign-in from one. `/commanders`
// stays protected: the pattern needs the slash.
//
// /sign-in is the in-app sign-in (Small items 11 A2): it is opened by a reader with no session, by definition, and the page
// itself sends a reader already signed in on (it alone reads where to). /sign-in/new, its address before the cutover, only
// redirects there. /sso-callback is where Google hands that reader back, still without one (the page finishes the sign-in).
// Exact forms, so nothing longer turns public.
//
// /preview/landing is the admin-only landing preview: public HERE only so a signed-out visitor reaches the page, which calls
// `auth()` and the admin check itself and answers the app's 404 to anyone else (never a sign-in redirect that would say the page exists).
// Every future page under /preview/ needs its own entry here: the exact-match list is deliberate, so an unlisted preview path stays protected.
const isPublic = createRouteMatcher(["/", "/preview/landing", "/preview/landing/", "/offline", "/card/(.*)", "/commander/(.*)", "/friend/(.*)", "/join/(.*)", "/sign-up(/.*)?", "/sign-in", "/sign-in/", "/sign-in/new", "/sign-in/new/", "/sso-callback", "/sso-callback/", "/privacy", "/privacy/", "/terms", "/terms/", "/report", "/report/", "/api/cron(.*)", "/api/health", "/api/health/", "/api/live", "/api/live/", "/api/clerk-webhook", "/api/clerk-webhook/", "/api/csp-report", "/api/csp-report/", "/api/stripe-webhook", "/api/stripe-webhook/"]);

export default clerkMiddleware(async (auth, req) => {
  // `isPublic` is path-only, and "/" is the one public path a SIGNED-IN reader uses constantly: it renders the
  // dashboard. So: protect what is not public, and read the session on what is, so a signed-in reader's switches
  // travel with every request either way. (The About gate that once redirected from here retired with About visual
  // PR 6b: Home's banner carries launches now.)
  // `[perf] proxy` with PERF_TIMING=1: what the proxy costs before any page runs, logged under the
  // request's own id. `memo` is how the switch overrides were answered: `hit` from the settled
  // per-instance memo, `pending` by waiting on another request's read, `miss` by a read of its own.
  const timing = process.env.PERF_TIMING === "1";
  const publicPath = isPublic(req);
  const t0 = timing ? performance.now() : 0;
  const { userId } = publicPath ? await auth() : await auth.protect();
  const t1 = timing ? performance.now() : 0;
  const memo = timing && userId ? switchSnapshotState() : null;
  const t2 = timing ? performance.now() : 0;
  // The reader's own switches (brief, locked rule 9): an account an override switches on sees that feature.
  const env = userId ? await resolveFlags(userId) : process.env;
  if (timing && userId) {
    console.log(`[perf] proxy auth=${Math.round(t1 - t0)} switches=${Math.round(performance.now() - t2)} memo=${memo}`);
  }
  const headers = new Headers(req.headers);
  // The reader's resolved switches travel with the request, so every page and action decides from this same snapshot
  // (`requestFlags`) and never from a second memo of its own. Stripped first, so no client can supply them.
  headers.delete(SWITCHES_HEADER);
  if (userId) headers.set(SWITCHES_HEADER, switchBits(env));
  const pass = () => NextResponse.next({ request: { headers } });
  const path = req.nextUrl.pathname;
  // A newcomer's browser is handed its claim secret when it first loads the invite page, so a first Send code whose
  // response never arrives still leaves the cookie behind; `claimInvite` binds the presented secret. Only a real navigation hands one out, never a prefetch, so a
  // link the pointer passes over cannot race the page's own load with a second secret.
  const withClaimCookie = (response: NextResponse): NextResponse => {
    const token = path.startsWith("/join/") ? path.slice("/join/".length) : "";
    if (isNavigation(req.method, req.headers) && isQrToken(token) && !req.cookies.get(CLAIM_COOKIE)) {
      response.cookies.set(CLAIM_COOKIE, mintClaimSecret(), claimCookieOptions(token));
    }
    return response;
  };
  // Only a signed-out browser is handed a claim secret: a member has nothing to claim.
  return userId ? pass() : withClaimCookie(pass());
}, {
  // Where `auth.protect()` sends a stranger: the in-app sign-in, with the page they asked for as Clerk's `redirect_url`, which
  // the page keeps only when it is on this site (`lib/auth/return-to.ts`). `app/layout.tsx` hands the browser the same two.
  signInUrl: SIGN_IN_PATH,
  signUpUrl: SIGN_UP_PATH,
});

export const config = {
  // The public pages' addresses may carry a dot in their name part (`/card/sol.ring-<id>`), which the first pattern
  // excludes as a static file. Without the proxy, `Shell`'s `auth()` throws instead of the page's 308 or 404. The same
  // holds for every route tree whose pages read the session under a dynamic segment (`/decks/x.png` is a bot's 404, and
  // its page's own `auth()` threw; Sentry THE-99-1): none of them serves a file. A dotted path anywhere else is a file or
  // a 404, which `shellUserId` draws signed out. `/about` matches its one dynamic segment alone (`/about/[area]`): its
  // images are files deeper under that path (`/about/pages/`, `/about/shots/`), which the proxy must not run on.
  matcher: [
    "/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)", "/card/(.*)", "/commander/(.*)",
    "/decks/(.*)", "/collection/(.*)", "/commanders/(.*)", "/friends/(.*)", "/friend/(.*)", "/join/(.*)", "/admin/(.*)", "/out/(.*)",
    "/about/:area",
  ],
};
