"use client";

// A session the server still believes in and Clerk has already ended. The shell is drawn from the session token the
// request carries, which `auth()` checks by signature alone: a token outlives its session by about a minute, so a reader
// who has just deleted their account (Clerk revokes every session, and the hosted page sends them back here) is drawn
// signed in, with no account behind it: Home's first-run page, "your account" and a "?" for the menu. Clerk's own browser
// client learns the truth on load (no session, no user), and nothing compared the two. Rendered only by the signed-in
// shell, so "the client has no session" always means a disagreement with the server.
//
// It acts only on a definite answer: Clerk loaded, a client with no session on it and no user. A Clerk that has not
// loaded (offline, blocked) says nothing and nothing is done. It signs the browser out (which drops the stale token's
// cookie) and goes to the signed-out landing. Once per minute at most, so a cookie that will not go cannot loop the page;
// that reader waits out the token exactly as before. Renders nothing.
import { useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

export const GHOST_KEY = "ghost-session-cleared-at";
const ONCE_PER_MS = 60_000;

export function GhostSession() {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();
  const sessions = clerk.client?.sessions?.length ?? null;
  const ghost = isLoaded && !user && sessions === 0;

  useEffect(() => {
    if (!ghost) return;
    try {
      const at = Number(window.sessionStorage.getItem(GHOST_KEY));
      if (at && Date.now() - at < ONCE_PER_MS) return;
      window.sessionStorage.setItem(GHOST_KEY, String(Date.now()));
    } catch {
      // Storage refused (a private window): the guard cannot be kept, so the page is not reloaded at all.
      return;
    }
    void (async () => {
      try {
        await clerk.signOut();
      } catch {
        // Nothing to end that Clerk still holds; the landing below is the answer either way.
      }
      window.location.replace("/");
    })();
  }, [ghost, clerk]);

  return null;
}
