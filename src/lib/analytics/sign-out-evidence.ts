// Evidence for the PWA sign-outs (Hugh, 2026-11-08): the installed app signs Hugh out although both Clerk instances
// allow 90-day sessions with no inactivity timeout. This only RECORDS what the browser saw when a reader who had been
// signed in here turns up signed out; it changes nothing about signing in. Read the events in PostHog, then decide.
//
// What leaves: the kind of event, whether the app runs installed, a coarse platform, whole hours since this browser
// last saw the reader signed in, which Clerk cookies were present (never their values), the page's visibility, how
// many sessions Clerk's client still holds, and whether the reader pressed Sign out. No name, email, user agent or
// cookie value. The Clerk id is what PostHog already identifies a reader by (docs/agents/ops.md).

/** When this browser last saw a reader signed in (epoch ms). A time only: whose it was is PostHog's identity. */
export const SEEN_KEY = "the99:auth-seen-at";
/** When the reader pressed Sign out here (epoch ms), so their own sign-out is told apart from a lost session. */
export const PRESSED_KEY = "the99:auth-sign-out-at";
/** A Sign out press counts for the sign-out that follows within this long. */
export const PRESS_WINDOW_MS = 5 * 60_000;

export type EvidenceKind = "signed_out_load" | "session_ended";
export type Platform = "ios" | "android" | "mac" | "windows" | "linux" | "other";
export type CookieState = "absent" | "zero" | "set";

export type BrowserFacts = {
  standalone: boolean;
  platform: Platform;
  /** `__client_uat`: Clerk's readable "signed in at" cookie; 0 when Clerk's client has no session. */
  clientUat: CookieState;
  /** `__session`: the short-lived session token cookie. */
  sessionCookie: boolean;
  visibility: string;
};

export type Evidence = BrowserFacts & {
  kind: EvidenceKind;
  hoursSinceSeen: number;
  pressedSignOut: boolean;
  clientSessions: number | null;
};

/**
 * The event for a reader turning up signed out, or null when this browser never saw them signed in (a first visit is
 * not a sign-out).
 */
export function signOutEvidence(input: {
  kind: EvidenceKind;
  seenAt: number | null;
  pressedAt: number | null;
  now: number;
  facts: BrowserFacts;
  clientSessions: number | null;
}): Evidence | null {
  if (input.seenAt === null) return null;
  const pressedSignOut = input.pressedAt !== null && input.now - input.pressedAt >= 0
    && input.now - input.pressedAt <= PRESS_WINDOW_MS;
  return {
    ...input.facts,
    kind: input.kind,
    hoursSinceSeen: Math.max(0, Math.floor((input.now - input.seenAt) / 3_600_000)),
    pressedSignOut,
    clientSessions: input.clientSessions,
  };
}

/** A coarse platform from the user agent; the user agent itself never leaves. An iPad asking for desktop pages reads as a Mac with touch. */
export function platformOf(userAgent: string, maxTouchPoints: number): Platform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  if (/Macintosh/.test(userAgent)) return maxTouchPoints > 1 ? "ios" : "mac";
  if (/Windows/.test(userAgent)) return "windows";
  if (/Linux|CrOS/.test(userAgent)) return "linux";
  return "other";
}

/** Which Clerk cookies a `document.cookie` string holds, by name alone (a suffixed `__client_uat_<id>` counts). */
export function clerkCookies(cookie: string): { clientUat: CookieState; sessionCookie: boolean } {
  let clientUat: CookieState = "absent";
  let sessionCookie = false;
  for (const part of cookie.split(";")) {
    const eq = part.indexOf("=");
    const name = (eq < 0 ? part : part.slice(0, eq)).trim();
    const value = eq < 0 ? "" : part.slice(eq + 1).trim();
    if (/^__client_uat(?:_|$)/.test(name)) {
      if (value !== "" && value !== "0") clientUat = "set";
      else if (clientUat === "absent") clientUat = "zero";
    } else if (/^__session(?:_|$)/.test(name)) {
      sessionCookie = true;
    }
  }
  return { clientUat, sessionCookie };
}

/** The browser half: read once, at the moment of the event. */
export function browserFacts(): BrowserFacts {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    standalone: window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true,
    platform: platformOf(nav.userAgent, nav.maxTouchPoints ?? 0),
    ...clerkCookies(document.cookie),
    visibility: document.visibilityState,
  };
}

/** Storage that may be blocked (a private window, cleared site data): every read and write is guarded. */
export function readTime(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeTime(key: string, value: number | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch {
    // Evidence only: a browser that keeps nothing simply reports nothing.
  }
}

/** Account menu's Sign out, before it calls Clerk. */
export function noteSignOutPressed(): void {
  writeTime(PRESSED_KEY, Date.now());
}
