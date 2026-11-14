"use client";

// A session the server still believes in and Clerk has already ended. The shell is drawn from the session token the
// request carries, which `auth()` checks by signature alone: a token outlives its session by about a minute, so a reader
// who has just deleted their account (Clerk revokes every session, and the hosted page sends them back here) is drawn
// signed in, with no account behind it: Home's first-run page, "your account" and a "?" for the menu. Clerk's own browser
// client learns the truth on load (no session, no user), and nothing compared the two. Rendered only by the signed-in
// shell, so "the client has no session" on arrival always means a disagreement with the server.
//
// It decides ONCE, on Clerk's first answer of this page load: a reader who signs out while the page is open ends their
// own session through the menu's own sign-out, and that answer is never this component's to act on. It acts only on a
// definite answer: Clerk ready (not loading, degraded or failed), a client with no session on it and no user; Clerk
// blocked or offline says nothing and nothing is done. It also stays off the sign-in, sign-up and Google-return pages and
// looks again after a moment: right after a sign-in (a Google return, an invitation's ticket, a session task) the server's
// cookie can lead Clerk's client by a beat, and an answer that is not there yet is not "no session". It signs the browser out (which drops the stale token's cookie)
// and goes to the signed-out landing. Once per minute at most, so a cookie that will not go cannot loop the page; that
// reader waits out the token exactly as before. Renders nothing.
import { useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { usePathname } from "next/navigation";
import { SSO_CALLBACK } from "../sign-in/sso-paths";

export const GHOST_KEY = "ghost-session-cleared-at";
const ONCE_PER_MS = 60_000;
/** How long the answer must hold before the browser is signed out: a sign-in's cookie leads Clerk's client by a moment. */
export const RECHECK_MS = 1_500;
/** The pages a sign-in is being made on: the server's cookie may lead Clerk's client there, so nothing is read as a ghost. */
const HANDSHAKE_PATHS = ["/sign-in", "/sign-up", SSO_CALLBACK];
const onHandshake = (path: string | null) => !path || HANDSHAKE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export function GhostSession() {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();
  const path = usePathname();
  const sessions = clerk.client?.sessions?.length ?? null;
  const ready = isLoaded && clerk.status === "ready" && !onHandshake(path);
  const decided = useRef(false);
  // What the timer reads when it fires, not what was true when it was set.
  const now = useRef({ user, sessions, clerk });
  useEffect(() => {
    now.current = { user, sessions, clerk };
  });

  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    const first = now.current;
    if (first.user || first.sessions !== 0) return;
    const timer = setTimeout(() => {
      const latest = now.current;
      if (latest.user || latest.sessions !== 0) return;
      try {
        const at = Number(window.sessionStorage.getItem(GHOST_KEY));
        if (at && Date.now() - at < ONCE_PER_MS) return;
        window.sessionStorage.setItem(GHOST_KEY, String(Date.now()));
      } catch {
        // Storage refused (a private window): the guard cannot be kept, so the page is not reloaded at all.
        return;
      }
      // A fixed tag only (nothing of the reader or the error travels): how often this happens in production.
      Sentry.captureException(new Error("ghost-session-cleared"), { level: "warning", tags: { site: "ghost-session" } });
      void (async () => {
        try {
          await latest.clerk.signOut({ redirectUrl: "/" });
        } catch {
          // Nothing to end that Clerk still holds; the landing below is the answer either way.
        }
        window.location.replace("/");
      })();
    }, RECHECK_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  return null;
}
