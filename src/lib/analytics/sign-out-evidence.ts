// Evidence for the PWA sign-outs (Hugh, 2026-11-08): the installed app signs Hugh out although both Clerk instances
// allow 90-day sessions with no inactivity timeout. This only RECORDS what the browser saw when a reader who had been
// signed in here turns up signed out; it changes nothing about signing in. Read the events in PostHog, then decide.
//
// What leaves: the kind of event, whether the app runs installed, a coarse platform, whole hours since this browser
// last saw the reader signed in, which Clerk cookies were present (never their values), the page's visibility, how
// many sessions Clerk's client still holds, and whether the reader pressed Sign out. No name, email, user agent or
// cookie value. The Clerk id is what PostHog already identifies a reader by (docs/agents/ops.md).

import { isProductionHostname } from "./posthog";

/** When this browser last saw a reader signed in (epoch ms). A time only: whose it was is PostHog's identity. */
export const SEEN_KEY = "the99:auth-seen-at";
/** When the reader pressed Sign out here (epoch ms), so their own sign-out is told apart from a lost session. */
export const PRESSED_KEY = "the99:auth-sign-out-at";
/** A Sign out press counts for the sign-out that follows within this long. */
export const PRESS_WINDOW_MS = 5 * 60_000;

/** A one-way hash of Clerk's client id as last seen while signed in here: whether the SAME client came back tells a lost client cookie from an ended session. */
export const CLIENT_KEY = "the99:auth-client";

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
  /** `navigator.onLine`: an installed app opened offline is one way Clerk could load without its session. */
  online: boolean;
};

export type Evidence = BrowserFacts & {
  kind: EvidenceKind;
  hoursSinceSeen: number;
  pressedSignOut: boolean;
  clientSessions: number | null;
  /**
   * Clerk's client id now against the one last seen signed in here. `true`: a different client, so the client cookie was lost or
   * rejected (it is not an ended session). `false`: the same client with no session, so the session ended. `null`: one side is unknown.
   */
  clientChanged: boolean | null;
};

/**
 * A short one-way hash of Clerk's client id (cyrb53, 14 hex), kept in localStorage and never sent: only whether it changed leaves. A client id is
 * an opaque random id, not a secret or a name; the hash keeps even that out of storage. Synchronous, so the evidence is captured before the reset.
 */
export function hashClientId(id: string | null | undefined): string | null {
  if (!id) return null;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

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
  /** The hash stored when this browser last saw the reader signed in, and the hash of the client Clerk holds now. */
  storedClient: string | null;
  currentClient: string | null;
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
    clientChanged: input.storedClient === null || input.currentClient === null ? null : input.storedClient !== input.currentClient,
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
    online: navigator.onLine,
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

export function readText(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeText(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Evidence only: a browser that keeps nothing simply reports nothing.
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

/** Account menu's Sign out, before it calls Clerk. Production hostnames only, like the rest of the evidence. */
export function noteSignOutPressed(): void {
  if (isProductionHostname(window.location.hostname)) writeTime(PRESSED_KEY, Date.now());
}

/** A Sign out that failed: the reader is still signed in. */
export function clearSignOutPressed(): void {
  writeTime(PRESSED_KEY, null);
}
